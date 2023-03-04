/*
  in order to adjust the build folder:
    1) import any files here you want in the final build package.
    2) copy the file path of the import.
    3) add the path to the ts.config.build.json under the { include: [...] } configuration.
    4) bump package.json version to publish a new package to npm.
*/

// ABIs
export { default as NFTMinterABI } from "../abi/NFTMinter.json";
export { default as LilypadCallerABI } from "../abi/LilypadCaller.json";
export { default as ERC721UpgradeableABI } from "../abi/ERC721Upgradeable.json";

// Contracts
export { NFTMinter } from "../typechain/src/NFTMinter";
export { LilypadCaller } from "../typechain/src/LilypadCaller";

// Factories
export { NFTMinter__factory as NFTMinterFactory } from "../typechain/factories/src/NFTMinter__factory";
