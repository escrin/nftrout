import { task } from "hardhat/config";

task("deploy", "Deploy contracts and verify").setAction(async ({}, { ethers, upgrades }) => {
  const NFTMinter = await ethers.getContractFactory("NFTMinter");
  const nftMinter = await upgrades.deployProxy(NFTMinter, {
    kind: "uups",
    unsafeAllow: ["constructor"],
  });
  await nftMinter.deployed();
  console.log(`NFTMinter is deployed to proxy address: ${nftMinter.address}`);

  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    try {
      const code = await nftMinter.instance?.provider.getCode(nftMinter.address);
      if (code === "0x") {
        console.log(`${nftMinter.name} contract deployment has not completed. waiting to verify...`);
        await nftMinter.instance?.deployed();
      }
      await hre.run("verify:verify", {
        address: nftMinter.address,
      });
    } catch ({ message }) {
      if ((message as string).includes("Reason: Already Verified")) {
        console.log("Reason: Already Verified");
      }
      console.error(message);
    }
  }
});
