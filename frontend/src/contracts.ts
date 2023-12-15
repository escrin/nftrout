import { ethers } from 'ethers';
import type { ComputedRef } from 'vue';
import { computed } from 'vue';

import type { NFTrout } from '@escrin/nftrout-evm';
import { NFTroutFactory } from '@escrin/nftrout-evm';
import sapphireTestnet from '@escrin/nftrout-evm/deployments/sapphire-testnet';
import sapphireMainnet from '@escrin/nftrout-evm/deployments/sapphire-mainnet';

import { Network, useEthereumStore } from './stores/ethereum';

export function useNFTrout(): ComputedRef<NFTrout | undefined> {
  const eth = useEthereumStore();
  return computed(() => {
    const deployment: string | undefined =
      eth.network === Network.SapphireTestnet
        ? sapphireTestnet.address
        : eth.network === Network.SapphireMainnet
          ? sapphireMainnet.address
          : undefined;
    if (!deployment) {
      console.error('no deployment for network', eth.network);
      return;
    }
    return NFTroutFactory.connect(
      deployment,
      (eth.signer ?? eth.provider) as ethers.ContractRunner,
    );
  });
}

// export function sapphireWrap(nftrout: NFTrout): NFTrout {
//   const eth = useEthereumStore();
//   if (eth.network !== Network.SapphireMainnet) return nftrout;
//   return nftrout.connect(sapphire.wrap((eth.signer as any) ?? eth.provider));
// }
