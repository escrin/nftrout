import type { BigNumber } from 'ethers';

import type { NFTrout } from '@escrin/nftrout-evm';

export interface Trout {
  chainId: number;
  id: BigNumber;
  key: string;
  cid: string;
  owned: boolean;
  fee?: BigNumber;
}

export async function troutCid(
  nftrout: NFTrout,
  troutId: BigNumber,
  blockTag: string | number = 'latest',
): Promise<string> {
  const uri = await nftrout.callStatic.tokenURI(troutId, { blockTag });
  return uri.replace('ipfs://', '');
}
