import { ethers } from 'ethers';
import type { ComputedRef } from 'vue';
import { computed } from 'vue';

import type { NFTrout } from '@escrin/nftrout-evm';
import { NFTroutFactory } from '@escrin/nftrout-evm';

import { Network, useEthereumStore } from './stores/ethereum';

export function useNFTrout(): ComputedRef<{
  read: NFTrout;
  write?: NFTrout;
}> {
  const eth = useEthereumStore();
  return computed(() => {
    let addr = '0xdE5DAB93f9008D4A2A746EB4e3903bF835D8c7D4';
    if (eth.network === Network.SapphireTestnet) {
      addr = '0x40b81e081b1aF09875a07376bdAD27507774e9a3';
    }
    const read = NFTroutFactory.connect(addr, eth.provider);
    const write = eth.signer
      ? NFTroutFactory.connect(addr, eth.signer)
      : undefined;
    return { read, write };
  });
}
