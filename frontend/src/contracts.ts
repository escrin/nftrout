import * as sapphire from '@oasisprotocol/sapphire-paratime';
import type { ComputedRef } from 'vue';
import { computed } from 'vue';

import type { NFTrout } from '@escrin/nftrout-evm';
import { NFTroutFactory } from '@escrin/nftrout-evm';

import { Network, useEthereumStore } from './stores/ethereum';

export function useNFTrout(): ComputedRef<NFTrout | undefined> {
  const eth = useEthereumStore();
  let addr: string;
  return computed(() => {
    if (eth.network === Network.Filecoin) {
      addr = '0xfcfed3be2d333f24854ca8d3a351e772272d5842';
    } else if (eth.network === Network.SapphireMainnet) {
      addr = '0xFcfed3be2d333F24854cA8d3A351E772272D5842';
    } else if (eth.network === Network.Hyperspace) {
      addr = '0x0E9B0116C9E649ae26070F3CCc702798099b8303';
    } else {
      return;
    }
    return NFTroutFactory.connect(addr, eth.signer ?? eth.provider);
  });
}

export function sapphireWrap(nftrout: NFTrout): NFTrout {
  const eth = useEthereumStore();
  if (eth.network !== Network.SapphireMainnet) return nftrout;
  return nftrout.connect(sapphire.wrap(eth.signer as any ?? eth.provider));
}
