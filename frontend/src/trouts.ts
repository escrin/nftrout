import type { NFTrout } from '@escrin/nftrout-evm';

export interface Trout {
  chainId: number;
  id: bigint;
  key: string;
  cid: string;
  owned: boolean;
  fee?: bigint;
}

export async function troutCid(
  nftrout: NFTrout,
  troutId: bigint,
  blockTag: string | number = 'latest',
): Promise<string> {
  const uri = await nftrout.tokenURI(troutId, { blockTag });
  return uri.replace('ipfs://', '');
}
