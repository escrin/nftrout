import { expect } from "chai";
import { ethers, upgrades } from "hardhat";
import { NFTMinter } from "../typechain";

describe("NFT Minter", function () {
  it("is upgradeable", async () => {
    const NFTMinter = await ethers.getContractFactory("NFTMinter");
    const instance = <NFTMinter>await upgrades.deployProxy(NFTMinter, {
      kind: "uups",
      unsafeAllow: ["constructor"],
    });

    const name = await instance.name();
    expect(name).to.equal("NFTMinter");
    await expect(instance.initialize()).to.be.revertedWith("Initializable: contract is already initialized");
  });
});
