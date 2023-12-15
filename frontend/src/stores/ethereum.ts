import detectEthereumProvider from '@metamask/detect-provider';
import { ethers } from 'ethers';
import { defineStore } from 'pinia';
import { computed, ref, shallowRef } from 'vue';

export enum Network {
  Unknown = 0,
  SapphireTestnet = 0x5aff,
  SapphireMainnet = 0x5afe,
  Hyperspace = 3141,
  Filecoin = 314,
  Local = 1337,
  Hardhat = 31337,
}

export enum ConnectionStatus {
  Unknown,
  Disconnected,
  Connected,
}

function networkFromChainId(chainId: number | string): Network {
  const id = typeof chainId === 'string' ? parseInt(chainId, 16) : chainId;
  if (Network[id]) return id as Network;
  return Network.Unknown;
}

export function networkName(network?: Network): string {
  if (network === Network.Local) return 'Local Network';
  if (network === Network.Hardhat) return 'Hardhat Network';
  if (network === Network.SapphireTestnet) return 'Sapphire Testnet';
  if (network === Network.SapphireMainnet) return 'Sapphire Mainnet';
  if (network === Network.Hyperspace) return 'FIL Hyperspace';
  if (network === Network.Filecoin) return 'FIL Mainnet';
  return 'Unknown Network';
}

export const useEthereumStore = defineStore('ethereum', () => {
  const signer = shallowRef<ethers.Signer | undefined>(undefined);
  const env = (import.meta as any).env;
  const provider = shallowRef<ethers.Provider>(
    new ethers.JsonRpcProvider(env.VITE_WEB3_GW_URL),
  );
  const network = ref<number>(env.VITE_CHAIN_ID);
  const address = ref<string | undefined>(undefined);
  const status = ref(ConnectionStatus.Unknown);

  const txOpts = computed(() =>
    network.value === Network.SapphireMainnet || network.value === Network.SapphireTestnet
      ? { gasLimit: 1_000_000 }
      : {},
  );

  const currency = computed(() => {
    if (network.value === Network.Filecoin || network.value === Network.Hyperspace) return 'FIL';
    if (network.value === Network.Local || network.value === Network.Hardhat) return 'TEST';
    if (network.value === Network.SapphireMainnet || network.value === Network.SapphireTestnet)
      return 'ROSE';
    return '三';
  });

  async function connect() {
    const eth = await detectEthereumProvider();
    if (eth === null) throw new Error('no provider detected'); // TODO: catch error
    const s = await new ethers.BrowserProvider(eth as any).getSigner();
    await s.provider.send('eth_requestAccounts', []);

    const setSigner = (addr: string | undefined, net: Network) => {
      signer.value = s;
      provider.value = s.provider;
      network.value = net;
      address.value = addr;
    };

    const [addr, net] = await Promise.all([
      s.getAddress(),
      s.provider.getNetwork().then(({ chainId }) => networkFromChainId(Number(chainId))),
    ]);
    setSigner(addr, net);

    if (!eth.isMetaMask) {
      status.value = ConnectionStatus.Connected;
      return;
    }
    eth.on('accountsChanged', (accounts) => {
      window.location.reload();
      setSigner(accounts[0], network.value);
    });
    eth.on('chainChanged', (chainId) => {
      window.location.reload();
      setSigner(address.value, networkFromChainId(chainId));
    });
    eth.on('connect', () => (status.value = ConnectionStatus.Connected));
    eth.on('disconnect', () => (status.value = ConnectionStatus.Disconnected));
  }

  async function switchNetwork(network: Network) {
    const eth = (window as any).ethereum;
    if (!eth) return;
    await eth.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: ethers.toBeHex(network) }],
    });
    window.location.reload();
  }

  return { signer, provider, address, network, connect, switchNetwork, txOpts, currency };
});
