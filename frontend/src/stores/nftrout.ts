import { defineStore } from 'pinia';
import { Address, Hash, hexToBigInt } from 'viem';
import { computed, reactive, ref } from 'vue';

import type { NFTrout } from '@escrin/nftrout-evm';

import { useNFTrout } from '../contracts';
import { Network, useEthereumStore } from './ethereum';

export type Trout = {
  id: number;
  owner: Address;
  imageUrl: string;
  name: string;
  fee?: bigint;
  parents?: [TroutId, TroutId];
  coi?: number;
  pending: boolean;
};

export type TroutId = {
  chainId: ChainId;
  tokenId: TokenId;
};

export type ChainId = number;
export type TokenId = number;

const INDEXER_URL = (import.meta as any).env.VITE_INDEXER_URL;

async function retry<T>(f: () => Promise<T>, tries = 3, delay = 1000): Promise<T> {
  let err: any;
  for (let i = 0; i < tries; i++) {
    try {
      return await f();
    } catch (e) {
      err = e;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw err;
}

async function fetchIndexedTrout(chainId: number): Promise<Trout[]> {
  return retry(async () => {
    const res = (await (await fetch(`${INDEXER_URL}/trout/${chainId}/`)).json()) as {
      result: Array<{
        id: number;
        owner: Address;
        name: string;
        fee?: Hash;
        parents: [TroutId, TroutId];
        pending?: true;
        coi: number;
      }>;
    };
    const trout = res.result.map(({ id, owner, name, fee, parents, pending, coi }) => ({
      id,
      owner,
      name,
      imageUrl: `${INDEXER_URL}/trout/${chainId}/${id}/image.svg`,
      fee: fee ? hexToBigInt(fee) : undefined,
      parents,
      pending: pending === true,
      coi,
    }));
    if (trout.length === 0) throw new Error('no indexed trout');
    return trout;
  });
}

async function fetchWeb3Trout(nftrout: NFTrout): Promise<Trout[]> {
  const supply = await retry(async () => Number(await nftrout.totalSupply()));

  const [ownerships, studs] = await Promise.all([
    retry(async () => {
      const batch: number[] = [];
      for (let i = 1; i <= supply; i++) batch.push(i);
      const ownerships = await nftrout.explicitOwnershipsOf(batch);
      return ownerships.map(([addr], i) => ({
        addr,
        id: batch[i],
      }));
    }),
    retry(async () => nftrout.getStuds(0, supply)),
  ]);

  const trout: Map<number, Trout> = new Map();

  const imageUrls: Map<number, string> = new Map();
  const pendings: Set<number> = new Set();
  const batchSize = 50;
  for (let i = 1; i <= supply; i += batchSize) {
    const batch: number[] = [];
    for (let j = 0; j < batchSize; j++) {
      if (i + j > supply) break;
      batch.push(i + j);
    }
    const urls = await Promise.allSettled(
      batch.map(
        (id): Promise<[number, string | undefined]> =>
          retry(async () => {
            const uri = await nftrout.tokenURI(id);
            const cid = uri.replace('ipfs://', '');
            return [id, cid ? `https://${cid}.ipfs.nftstorage.link/image/trout.svg` : undefined];
          }),
      ),
    );
    for (const result of urls) {
      if (result.status === 'rejected') continue;
      const [id, maybeUrl] = result.value;
      if (maybeUrl) {
        imageUrls.set(id, maybeUrl);
      } else {
        pendings.add(id);
      }
    }
  }

  for (const { addr, id } of ownerships) {
    trout.set(id, {
      id,
      imageUrl: imageUrls.get(id) ?? '',
      name: `TROUT #${id}`,
      owner: addr as Address,
      pending: pendings.has(id),
    });
  }
  for (const { tokenId, fee } of studs) {
    trout.get(Number(tokenId))!.fee = fee;
  }

  return [...trout.values()];
}

export const useTroutStore = defineStore('nftrout', () => {
  const isLoaded = ref(false);
  const mode = ref<'indexed' | 'decentralized'>('indexed');

  const trout = ref<Record<number, Trout>>({});

  const eth = useEthereumStore();
  const nftrout = useNFTrout();
  const localPendingCount = ref(0);

  const fetchTrout = async () => {
    let tokens: Array<Trout> = [];
    try {
      if (eth.network !== Network.SapphireMainnet)
        throw new Error('network not supported by indexer');
      tokens = await fetchIndexedTrout(eth.network);
      mode.value = 'indexed';
    } catch (e: any) {
      console.warn('failed to fetch indexed trout:', e);
      tokens = await fetchWeb3Trout(nftrout.value);
      mode.value = 'decentralized';
    }
    trout.value = Object.fromEntries(tokens.map((t) => [t.id, t]));
    localPendingCount.value = 0;
    isLoaded.value = true;
  };

  const updateFee = async (troutId: number, fee: bigint) => {
    trout.value[troutId].fee = fee;
  };

  const isWallet = (addr: string) => addr.toLowerCase() === eth.address?.toLowerCase();

  const ownedTrout = computed(() =>
    Object.values(trout.value).filter(({ owner, pending }) => isWallet(owner) && !pending),
  );
  const farmedTrout = computed(() =>
    Object.values(trout.value).filter(({ fee }) => (fee ?? 0n) > 0n),
  );
  const indexedPendingCount = computed(() =>
    Object.values(trout.value).reduce(
      (count, { owner, pending }) => (isWallet(owner) && pending ? count + 1 : count),
      0,
    ),
  );
  const pendingCount = computed(() => indexedPendingCount.value + localPendingCount.value);

  const incLocalPendingCount = () => (localPendingCount.value += 1);

  const events = reactive(new Map());
  const fetchTroutEvents = async (id: number) => {
      const res = await fetch(`${INDEXER_URL}/trout/${eth.network}/${id}/events`);
      if (!res.ok) throw new Error(await res.text());
      const { result } = await res.json();
      events.set(id, result);
  };

  const setTroutName = async (id: number, name: string) => {
    const sig = await eth.walletClient!.signTypedData({
      account: eth.address as `0x${string}`,
      domain: {
        name: 'NameRequest',
        version: '1',
        chainId: eth.network,
        verifyingContract: '0x0000000000000000000000000000000000000000',
      },
      types: {
        NameRequest: [
          { name: 'trout', type: 'uint256' },
          { name: 'name', type: 'string' },
        ],
      },
      primaryType: 'NameRequest',
      message: {
        trout: BigInt(id),
        name,
      },
    });
    const orig = trout.value[id].name;
    trout.value[id].name = name;
    try {
      const res = await fetch(`${INDEXER_URL}/trout/${eth.network}/${id}/name`, {
        method: 'POST',
        body: JSON.stringify({ name, sig }),
        headers: {
          'content-type': 'application/json',
        },
      });
      if (!res.ok) throw new Error(await res.text());
    } catch {
      trout.value[id].name = orig;
    }
  };

  return {
    trout,
    ownedTrout,
    farmedTrout,
    fetchTrout,
    isLoaded,
    updateFee,
    mode,
    pendingCount,
    incLocalPendingCount,
    setTroutName: mode.value === 'indexed' ? setTroutName : async () => {},
    events,
    fetchTroutEvents: mode.value === 'indexed' ? fetchTroutEvents : async () => {},
  };
});
