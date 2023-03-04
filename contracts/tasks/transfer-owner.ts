import { task } from "hardhat/config";

task("transfer-owner", "Transfer ownership of ProxyAdmin contract")
  .addParam("proxy", "Proxy contract address")
  .addParam("owner", "Address of new owner")
  .setAction(async ({ proxy, owner }, { ethers, upgrades }) => {
    const NFTMinter = await ethers.getContractFactory("NFTMinter");
    const nftMinter = await NFTMinter.attach(proxy);

    console.log('Transferring ownership of proxy contract...');
    const transferTransaction = await nftMinter.transferOwnership(owner);
    console.log("Sent transfer transaction, waiting for transaction receipt...");

    const transferReceipt = await transferTransaction.wait();
    if (transferReceipt == null || transferReceipt.status == 0) {
      console.error(transferReceipt);
      console.error("Transaction failed, failed to transfer contract");
      return;
    }

    console.log(`Transaction succeeded. Transaction Hash: ${transferReceipt.transactionHash}`);

    const newOwner = await nftMinter.owner();
    if (newOwner !== owner) {
      console.error(`Verification failed: the contract is owned by ${newOwner}.`);
      return;
    }

    console.log(`Successfully verified that the NFTMinter contract was transferred. Contract address: ${proxy}`);
  }
);
