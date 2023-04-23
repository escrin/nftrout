export { NFTrout__factory as NFTroutFactory } from '../typechain-types/factories/contracts/NFTrout__factory';
export { NFTrout } from '../typechain-types/contracts/NFTrout';

import sapphireTestnet from '../deployments/sapphire-testnet/NFTrout.json';

export const DEPLOYMENTS = {
  0x5aff: sapphireTestnet,
  0x5afe: null,
  314: null,
  3141: null,
};
