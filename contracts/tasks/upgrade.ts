import { task } from "hardhat/config";

/**
 * Used to upgrade a contract directly via local keys
 */
task("upgrade", "Upgrade implementation contract and verify")
  .addParam("proxy", "Provider proxy address")
  .setAction(async ({ proxy }, { ethers, upgrades }) => {
    const NFTMinter = await ethers.getContractFactory("NFTMinter");

    // Validate (redundant?)
    console.log("Validating upgrade..");
    await upgrades.validateUpgrade(proxy, NFTMinter).then(() => console.log("Valid upgrade. Deploying.."));

    // Upgrade
    const nftMinterUpgrade = await upgrades.upgradeProxy(proxy, NFTMinter, {
      kind: "uups",
      unsafeAllow: ["constructor"],
    });
    await nftMinterUpgrade.deployed();
    console.log(`NFTMinter at proxy address ${nftMinterUpgrade.address} was upgraded`);

    try {
      const code = await nftMinterUpgrade.instance?.provider.getCode(nftMinterUpgrade.address);
      if (code === "0x") {
        console.log(`${nftMinterUpgrade.name} contract upgrade has not completed. waiting to verify...`);
        await nftMinterUpgrade.instance?.deployed();
      }
      await hre.run("verify:verify", {
        address: nftMinterUpgrade.address,
      });
    } catch ({ message }) {
      if ((message as string).includes("Reason: Already Verified")) {
        console.log("Reason: Already Verified");
      }
      console.error(message);
    }
  });

/**
 * Used to propose a multi-sig upgrade via OpenZeppelin Defender
 */
task("propose-upgrade", "Propose an upgrade to OpenZeppelin Defender")
  .addParam("proxy", "Proxy contract address")
  .addParam("multisig", "Owner multisig address")
  .setAction(async ({ proxy, multisig }, { ethers, upgrades }) => {
    const NFTMinter = await ethers.getContractFactory("NFTMinter");
    console.log("Proposing upgrade..");
    const proposal = await defender.proposeUpgrade(proxy, NFTMinter, {
      multisig
    });
    console.log("Upgrade proposal created at: ", proposal.url);
  });

