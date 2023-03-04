import { task } from "hardhat/config";

task("pause", "Pause deployed NFTMinter contract")
  .addParam("address", "contract address")
  .setAction(async ({ address }, { ethers }) => {
    const NFTMinter = await ethers.getContractFactory("NFTMinter");
    const nftMinter = await NFTMinter.attach(address);

    const pauseTransaction = await nftMinter.pause();
    console.log("Sent pause transaction, waiting for transaction receipt...");

    const pauseReceipt = await pauseTransaction.wait();
    if (pauseReceipt == null || pauseReceipt.status == 0) {
      console.error(pauseReceipt);
      console.error("Transaction failed, failed to pause contract");
      return;
    }

    console.log(`Transaction succeeded. Transaction Hash: ${pauseReceipt.transactionHash}`);

    const isPaused = await nftMinter.paused();
    if (!isPaused) {
      console.error("Verification failed: the contract is not paused. This is a big deal.");
      return;
    }

    console.log(`Successfully verified that the NFTMinter contract was paused. Contract address: ${address}`);
  });
