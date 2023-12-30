import { ethers } from 'ethers';
import type { ComputedRef } from 'vue';
import { computed } from 'vue';

import type { NFTrout } from '@escrin/nftrout-evm';
import { NFTroutFactory } from '@escrin/nftrout-evm';
import sapphireTestnet from '@escrin/nftrout-evm/deployments/sapphire-testnet';
import sapphireMainnet from '@escrin/nftrout-evm/deployments/sapphire-mainnet';

import { Network, useEthereumStore } from './stores/ethereum';

export function useNFTrout(): ComputedRef<NFTrout> {
  const eth = useEthereumStore();
  return computed(() => {
    let deployment: string | undefined =
      eth.network === Network.SapphireTestnet
        ? sapphireTestnet.address
        : eth.network === Network.SapphireMainnet
          ? sapphireMainnet.address
          : undefined;
    if (!deployment) {
      console.error(`no nftrout deployment for network: ${eth.network}`);
      deployment = sapphireMainnet.address;
    }
    return NFTroutFactory.connect(
      deployment,
      (eth.signer ?? eth.provider) as ethers.ContractRunner,
    );
  });
}
