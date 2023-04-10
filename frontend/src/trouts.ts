import type { BigNumber } from 'ethers';

import type { NFTrout } from '@escrin/nftrout-evm';

export interface Trout {
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
  try {
    const uri = await nftrout.callStatic.tokenURI(troutId, { blockTag });
    const cid = uri.replace('ipfs://', '');
    if (!cid) throw new Error('no uri');
    const res = await fetch(`https://ipfs.escrin.org/ipfs/${cid}/outputs/trout.svg`, {
      mode: 'cors',
    });
    if (!res.ok) throw new Error('request failed');
    return cid;
  } catch {
    return '';
  }
}
