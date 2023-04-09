import type { BigNumber } from 'ethers';

export interface Trout {
  id: BigNumber;
  key: string;
  cid: string;
  owned: boolean;
  fee?: BigNumber;
}
