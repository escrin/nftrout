import * as sapphire from '@oasisprotocol/sapphire-paratime';
import type { ComputedRef } from 'vue';
import { computed } from 'vue';

import type { NFTrout } from '@escrin/nftrout-evm';
import { DEPLOYMENTS, NFTroutFactory } from '@escrin/nftrout-evm';

import { Network, useEthereumStore } from './stores/ethereum';

export function useNFTrout(): ComputedRef<NFTrout | undefined> {
  const eth = useEthereumStore();
  return computed(() => {
    const deployment = DEPLOYMENTS[eth.network];
    if (!deployment) {
      console.error('no deployment for network', eth.network);
      return;
    }
    return NFTroutFactory.connect(deployment.address, eth.signer ?? eth.provider);
  });
}

export function sapphireWrap(nftrout: NFTrout): NFTrout {
  const eth = useEthereumStore();
  if (eth.network !== Network.SapphireMainnet) return nftrout;
  return nftrout.connect(sapphire.wrap((eth.signer as any) ?? eth.provider));
}
