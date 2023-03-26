import type { BigNumber } from "ethers";

export interface Trout {
  id: BigNumber;
  imageUrl: string;
  owned: boolean;
  fee?: BigNumber;
}
