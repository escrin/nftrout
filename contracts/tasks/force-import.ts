import { task } from "hardhat/config";

task("force-import", "Deploy contracts and verify")
  .addParam("proxy", "Proxy contract address")
  .setAction(async ({ proxy }, { ethers, upgrades }) => {
    const NFTMinter = await ethers.getContractFactory("NFTMinter");
    const nftMinter = await upgrades.forceImport(
      proxy,
      NFTMinter,
      {
        kind: "uups",
      },
    );
    await nftMinter.deployed();
    console.log(`NFTMinter imported: ${nftMinter.address}`);
  });
