import type { BigNumber } from 'ethers';

export interface Trout {
  id: BigNumber;
  cid: string;
  owned: boolean;
  fee?: BigNumber;
}
