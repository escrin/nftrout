import { ethers } from 'hardhat';
import { expect } from 'chai';
import { LilypadEvents, NFTrout } from '../typechain-types';
import { SignerWithAddress } from 'hardhat-deploy-ethers/signers';

const MINT_FEE = 100;
const MATCHMAKING_BPS = 500;
const OWNER_LISTED_PRICE = 500_000;
const HODLR_LISTED_PRICE = 7_000_000;

describe('NFTrout', () => {
  let nft: NFTrout;
  let lilypadEvents: LilypadEvents;

  let owner: SignerWithAddress;
  let hodlr: SignerWithAddress;
  let other: SignerWithAddress;

  beforeEach(async () => {
    [owner, hodlr, other] = await ethers.getSigners();

    const LilypadEvents = await ethers.getContractFactory('LilypadEvents');
    lilypadEvents = (await LilypadEvents.deploy()) as LilypadEvents;
    await lilypadEvents.deployed();

    const NFTrout = await ethers.getContractFactory('NFTrout');
    nft = (await NFTrout.deploy(
      lilypadEvents.address,
      MINT_FEE,
      MATCHMAKING_BPS,
      false,
    )) as NFTrout;
    await nft.deployed();

    await (await lilypadEvents.setAuthorizedContract(nft.address)).wait();

    // odd numbers are unlisted. the first three belong to the owner, and the second two to the hodlr.
    await nft.connect(owner).mint();
    await nft.connect(owner).mint();
    await nft.connect(owner).list(2, OWNER_LISTED_PRICE);
    await nft.connect(owner).mint();
    await nft.connect(hodlr).mint({ value: MINT_FEE });
    await nft.connect(hodlr).list(4, HODLR_LISTED_PRICE);
    await nft.connect(hodlr).mint({ value: MINT_FEE });

    // Withdraw the initial mint fees, checking that the payout amount is correct;
    const initOwnerBal = await ethers.provider.getBalance(owner.address);
    expect(await ethers.provider.getBalance(nft.address)).to.equal(MINT_FEE * 2);
    const gasPrice = ethers.utils.parseUnits('1', 'gwei');
    const receipt = await (await nft.withdraw({ gasPrice })).wait();
    const finalOwnerBal = await ethers.provider.getBalance(owner.address);
    const gasFee = receipt.gasUsed.mul(gasPrice);
    expect(finalOwnerBal.add(gasFee).sub(initOwnerBal)).to.equal(MINT_FEE * 2);
    expect(await ethers.provider.getBalance(nft.address)).to.equal(0);
    expect(await nft.callStatic.earnings(hodlr.address)).to.equal(0);
  });

  describe('mint', () => {
    it('should allow owner to mint a trout for free', async () => {
      await expect(nft.connect(owner).mint()).to.emit(nft, 'Transfer');
      expect(await nft.ownerOf(6)).to.equal(owner.address);
    });

    it('should allow anyone to mint a trout with a mint fee', async () => {
      await expect(nft.connect(other).mint({ value: MINT_FEE })).to.emit(nft, 'Transfer');
      expect(await nft.ownerOf(6)).to.equal(other.address);
      expect(await nft.callStatic.earnings(owner.address)).to.equal(MINT_FEE);
    });

    it('should not allow minting without sufficient payment', async () => {
      await expect(nft.connect(other).mint({ value: 50 })).to.be.revertedWithCustomError(
        nft,
        'PaymentRequired',
      );
    });
  });

  describe('list', () => {
    it('should not allow non-owners to list a trout', async () => {
      await expect(nft.connect(hodlr).list(1, 50)).to.be.revertedWithCustomError(nft, 'NotOwner');
    });

    it('should emit a Listed event', async () => {
      await expect(nft.connect(hodlr).list(5, 50)).to.emit(nft, 'Listed').withArgs(5, 50);
    });
  });

  describe('delist', () => {
    it('should allow owner to delist a trout', async () => {
      await expect(nft.connect(owner).delist(2)).to.emit(nft, 'Delisted').withArgs(2);
    });

    it('should not allow non-owners to delist a trout', async () => {
      await expect(nft.connect(hodlr).delist(2)).to.be.revertedWithCustomError(nft, 'NotOwner');
    });
  });

  describe('breed', () => {
    it('should fail if trying to breed a trout with itself', async () => {
      await expect(nft.breed(1, 1)).to.be.revertedWithCustomError(nft, 'CannotSelfBreed');
    });

    it('should fail if trying to breed a trout that does not exist', async () => {
      await expect(nft.breed(1, 100)).to.be.revertedWithCustomError(nft, 'NoSuchToken');
      await expect(nft.breed(100, 1)).to.be.revertedWithCustomError(nft, 'NoSuchToken');
      await expect(nft.breed(100, 100)).to.be.revertedWithCustomError(nft, 'NoSuchToken');
    });

    it('should fail if a trout is not breedable', async () => {
      const breedAs = async (whom: SignerWithAddress, left: number, right: number) =>
        nft.connect(whom).breed(left, right, { value: ethers.utils.parseEther('100') });
      await expect(breedAs(owner, 1, 2)).not.to.be.revertedWithCustomError(nft, 'NotListed');
      await expect(breedAs(owner, 1, 3)).not.to.be.revertedWithCustomError(nft, 'NotListed');
      await expect(breedAs(owner, 3, 5)).to.be.revertedWithCustomError(nft, 'NotListed');
      await expect(breedAs(hodlr, 1, 5)).to.be.revertedWithCustomError(nft, 'NotListed');
      await expect(breedAs(hodlr, 5, 3)).to.be.revertedWithCustomError(nft, 'NotListed');
    });

    it('should fail if the caller does not provide enough value to pay for the fees', async () => {
      await expect(nft.connect(hodlr).breed(4, 5, { value: 1 })).to.be.revertedWithCustomError(
        nft,
        'PaymentRequired',
      );
    });

    it('should pay the stud fees and mint a new trout when successful', async () => {
      const breedingFee = await nft.connect(other).callStatic.getBreedingFee(2, 4);
      const result = await nft.connect(other).breed(2, 4, { value: breedingFee });
      const receipt = await result.wait();
      const newTokenId = receipt.events!.find((e) => e.event === 'Spawned')!.args!.child;
      expect(await nft.ownerOf(newTokenId)).to.equal(await other.getAddress());

      expect(await nft.callStatic.earnings(owner.address)).to.equal(
        MINT_FEE + OWNER_LISTED_PRICE + Math.floor(HODLR_LISTED_PRICE * 0.05),
      );
      expect(await nft.callStatic.earnings(hodlr.address)).to.equal(
        Math.ceil(HODLR_LISTED_PRICE * 0.95),
      );
    });
  });

  describe('job completion', () => {
    const jobId = 1;
    const tokenId = 1;
    const CID = 0;
    const cid = 'Qmblahblahblah';

    it('should enqueue the same job again if it has been cancelled', async () => {
      await expect(lilypadEvents.returnBacalhauError(nft.address, jobId, 'oops big error')).to.emit(
        lilypadEvents,
        'NewBacalhauJobSubmitted',
      );
    });

    it('should correctly set tokenURI if it has fulfilled', async () => {
      await expect(lilypadEvents.returnBacalhauResults(nft.address, jobId, CID, cid)).to.emit(
        lilypadEvents,
        'BacalhauJobResultsReturned',
      );
      expect(await nft.callStatic.tokenURI(tokenId)).to.equal(`ipfs://${cid}`);
    });

    it('should not respond to non-lilypad', async () => {
      await expect(
        nft.lilypadFulfilled(nft.address, jobId, CID, cid),
      ).to.be.revertedWithCustomError(nft, 'NotLilypad');
      await expect(nft.lilypadCancelled(nft.address, jobId, 'error')).to.be.revertedWithCustomError(
        nft,
        'NotLilypad',
      );
    });
  });

  describe('getStuds', () => {
    it('empty array past end', async () => {
      expect(await nft.callStatic.getStuds(999, 1)).to.empty;
    });

    it('empty count', async () => {
      expect(await nft.callStatic.getStuds(0, 0)).to.be.empty;
    });

    it('extra count', async () => {
      let studs = await nft.callStatic.getStuds(0, 5);
      expect(studs.length).to.equal(2);
      studs = await nft.callStatic.getStuds(1, 5);
      expect(studs.length).to.equal(1);
    });
  });
});
