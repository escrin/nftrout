import type { ComputedRef } from "vue";
import { computed } from "vue";

import type { NFTrout } from "@escrin/nftrout-evm";
import { NFTroutFactory } from "@escrin/nftrout-evm";

import { useEthereumStore } from "./stores/ethereum";

export function useNFTrout(): ComputedRef<NFTrout> {
  const eth = useEthereumStore();
  const addr = import.meta.env.VITE_NFTROUT_ADDR!;
  return computed(() => {
    return NFTroutFactory.connect(addr, eth.signer ?? eth.provider);
  });
}
