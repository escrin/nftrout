const { task } = require('hardhat/config');

// import '@oasisprotocol/sapphire-hardhat';
require('@typechain/hardhat')
require('@nomicfoundation/hardhat-ethers')
require('@nomicfoundation/hardhat-chai-matchers')
require('hardhat-watcher');
require('hardhat-deploy');
require('hardhat-deploy-ethers');

const accounts = process.env.PRIVATE_KEY
  ? [process.env.PRIVATE_KEY]
  : process.env.MNEMONIC
  ? { mnemonic: process.env.MNEMONIC }
  : [];

task('accounts').setAction(async (_, hre) => {
  const { ethers } = hre;
  const signers = await ethers.getSigners();
  const balances = await Promise.all(signers.map((s) => ethers.provider.getBalance(s.address)));
  for (let i = 0; i < signers.length; i++) {
    let num;
    try {
      num = balances[i].toNumber();
    } catch {
      num = ethers.utils.formatEther(balances[i]);
    }
    console.log(signers[i].address, num);
  }
});

task('mint').setAction(async (_, hre) => {
  const { ethers } = hre;
  const [{ address: minter }] = await ethers.getSigners();
  const nftrout = (await ethers.getContract('NFTrout'));
  const tx = await nftrout.mint({ value: await nftrout.callStatic.getBreedingFee(minter, 0, 0) });
  const receipt = await tx.wait();
  for (const event of receipt.events) {
    if (event.event !== 'Transfer') continue;
    console.log(ethers.BigNumber.from(receipt.events[0].topics[3]).toNumber());
    break;
  }
});

task('breed')
  .addPositionalParam('left')
  .addPositionalParam('right')
  .setAction(async (args, hre) => {
    const { ethers } = hre;
    const nftrout = (await ethers.getContract('NFTrout'));
    const [{ address: breeder }] = await ethers.getSigners();
    const breedingFee = await nftrout.callStatic.getBreedingFee(breeder, args.left, args.right);
    const tx = await nftrout.breed(args.left, args.right, {
      value: breedingFee,
    });
    console.log(tx.hash);
    const receipt = await tx.wait();
    for (const event of receipt.events) {
      if (event.event !== 'Transfer') continue;
      console.log(ethers.BigNumber.from(receipt.events[0].topics[3]).toNumber());
      break;
    }
  });

task('uri')
  .addParam('id')
  .setAction(async (args, hre) => {
    const { ethers } = hre;
    const nftrout = (await ethers.getContract('NFTrout'));
    console.log(await nftrout.callStatic.tokenURI(args.id));
  });

task('make-breedable')
  .addParam('id')
  .addParam('fee')
  .setAction(async (args, hre) => {
    const { ethers } = hre;
    const nftrout = (await ethers.getContract('NFTrout'));
    const tx = await nftrout.list(args.id, ethers.utils.parseEther(args.fee));
    console.log(tx.hash);
    await tx.wait();
  });

task('transfer')
  .addParam('id')
  .addParam('to')
  .setAction(async (args, hre) => {
    const { ethers } = hre;
    const nftrout = (await ethers.getContract('NFTrout'));
    const tx = await nftrout.transferFrom(await nftrout.signer.getAddress(), args.to, args.id);
    console.log(tx.hash);
    await tx.wait();
  });

task('list-breedable').setAction(async (_, hre) => {
  const { ethers } = hre;
  const nftrout = (await ethers.getContract('NFTrout'));
  const { number: blockTag } = await ethers.provider.getBlock('latest');
  const batchSize = 100;
  for (let offset = 0; ; offset += batchSize) {
    let studs = [];
    try {
      studs = await nftrout.callStatic.getStuds(offset, batchSize, {
        blockTag,
      });
    } catch (e) {
      console.error('failed to fetch studs', e);
      break;
    }
    await Promise.all(
      studs.map(async ({ tokenId, fee }) => {
        const tokenUri = await nftrout.callStatic.tokenURI(tokenId);
        console.log(tokenId.toNumber(), ethers.utils.formatEther(fee), tokenUri);
      }),
    );
    if (studs.length < batchSize) break;
  }
});

task('get-owners').setAction(async (_, hre) => {
  const { ethers } = hre;
  const nftrout = (await ethers.getContract('NFTrout'));
  const totalSupply = (await nftrout.callStatic.totalSupply()).toNumber();
  const ownerPs = [];
  for (let i = 1; i <= totalSupply; i++) {
    ownerPs.push(nftrout.callStatic.ownerOf(i));
  }
  const owners = await Promise.all(ownerPs);
  for (const owner of owners) {
    console.log(owner);
  }
});

task('set-matchmaking-bps')
  .addParam('value')
  .setAction(async (args, hre) => {
    const { ethers } = hre;
    const nftrout = (await ethers.getContract('NFTrout'));
    const newMatchBps = ethers.BigNumber.from(args.matchmakingBps);
    const tx = await nftrout.setMatchmakingFee(newMatchBps);
    console.log(tx.hash);
    await tx.wait();
  });

task('set-task-acceptor')
  .addParam('addr')
  .setAction(async ({ addr }, hre) => {
    const { ethers } = hre;
    const nftrout = (await ethers.getContract('NFTrout'));
    const tx = await nftrout.setTaskAcceptor(addr);
    console.log(tx.hash);
    await tx.wait();
  });

task('set-mint-reward')
  .addParam('value')
  .setAction(async ({ value }, hre) => {
    const { ethers } = hre;
    const nftrout = (await ethers.getContract('NFTrout'));
    const newMintReward = ethers.utils.parseEther(value);
    const tx = await nftrout.setMintReward(newMintReward);
    console.log(tx.hash);
    await tx.wait();
  });

task('transfer-ownership')
  .addPositionalParam('owner')
  .setAction(async ({ owner }, hre) => {
    const { ethers } = hre;
    const nftrout = (await ethers.getContract('NFTrout'));
    const tx = await nftrout.transferOwnership(owner);
    console.log(tx.hash);
    await tx.wait();
  });

task('coverage', async (_args, hre, runSuper) => {
  hre.config.solidity.compilers.forEach((sc) => (sc.settings.viaIR = false));
  await runSuper();
});

module.exports = {
  solidity: {
    version: '0.8.18',
    settings: {
      optimizer: {
        enabled: true,
        runs: Math.pow(2, 32) - 1,
      },
      viaIR: true,
    },
  },
  networks: {
    local: {
      url: 'http://127.0.0.1:8545',
      chainId: 31337,
    },
    'sapphire-testnet': {
      url: 'https://testnet.sapphire.oasis.dev',
      // url: 'http://127.0.0.1:8545',
      chainId: 0x5aff,
      accounts,
    },
    sapphire: {
      url: 'https://sapphire.oasis.io',
      // url: 'http://127.0.0.1:8545',
      chainId: 0x5afe,
      accounts,
    },
    hyperspace: {
      url: 'https://rpc.ankr.com/filecoin_testnet',
      chainId: 314159.,
      accounts,
    },
    filecoin: {
      url: 'https://rpc.ankr.com/filecoin',
      chainId: 314,
      accounts,
    },
  },
  watcher: {
    compile: {
      tasks: ['compile'],
      files: ['./contracts/'],
    },
    test: {
      tasks: ['test'],
      files: ['./contracts/', './test'],
    },
    coverage: {
      tasks: ['coverage'],
      files: ['./contracts/', './test'],
    },
  },
  namedAccounts: {
    deployer: 0,
  },
};
