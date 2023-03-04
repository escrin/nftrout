import { task } from "hardhat/config";

task("unpause", "Unpause deployed NFTMinter contract")
  .addParam("address", "contract address")
  .setAction(async ({ address }, { ethers }) => {
    const NFTMinter = await ethers.getContractFactory("NFTMinter");
    const nftMinter = await NFTMinter.attach(address);

    const unpauseTransaction = await nftMinter.unpause();
    console.log("Sent pause transaction, waiting for transaction receipt...");

    const unpauseReceipt = await unpauseTransaction.wait();
    if (unpauseReceipt == null || unpauseReceipt.status == 0) {
      console.error(unpauseReceipt);
      console.error("Transaction failed, failed to unpause contract");
      return;
    }

    console.log(`Transaction succeeded. Transaction Hash: ${unpauseReceipt.transactionHash}`);

    const isPaused = await nftMinter.paused();
    if (isPaused) {
      console.error("Verification failed: the contract is still paused");
      return;
    }

    console.log(
      `Successfully verified that the NFTMinter contract is no longer paused. Contract address: ${address}`,
    );
  });
