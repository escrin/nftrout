import { defineStore } from 'pinia';
import { Address, Hash, hexToBigInt } from 'viem';
import { computed, ref } from 'vue';

import type { NFTrout } from '@escrin/nftrout-evm';

import { useNFTrout } from '../contracts';
import { useEthereumStore } from './ethereum';

export type Trout = {
  id: number;
  owner: Address;
  imageUrl: string;
  fee?: bigint;
  parents?: [TroutId, TroutId];
};

export type TroutId = {
  chainId: ChainId;
  tokenId: TokenId;
}

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
      result: Array<{ id: number; owner: Address; fee?: Hash; parents: [TroutId, TroutId] }>;
    };
    const trout = res.result.map(({ id, owner, fee, parents }) => ({
      id,
      owner,
      imageUrl: `${INDEXER_URL}/trout/${chainId}/${id}/image.svg`,
      fee: fee ? hexToBigInt(fee) : undefined,
      parents,
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
  const batchSize = 50;
  for (let i = 1; i <= supply; i += batchSize) {
    const batch: number[] = [];
    for (let j = 0; j < batchSize; j++) {
      if (i + j > supply) break;
      batch.push(i + j);
    }
    const urls = await Promise.allSettled(
      batch.map(
        (id): Promise<[number, string]> =>
          retry(async () => {
            const uri = await nftrout.tokenURI(id);
            const cid = uri.replace('ipfs://', '');
            return [id, `https://${cid}.ipfs.nftstorage.link/image/trout.svg`];
          }),
      ),
    );
    for (const result of urls) {
      if (result.status === 'rejected') continue;
      const [id, url] = result.value;
      imageUrls.set(id, url);
    }
  }

  for (const { addr, id } of ownerships) {
    trout.set(id, {
      id,
      imageUrl: imageUrls.get(id) ?? '',
      owner: addr as Address,
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

  // const eth
  const fetchTrout = async () => {
    let tokens: Array<Trout> = [];
    try {
      tokens = await fetchIndexedTrout(eth.network);
      mode.value = 'indexed';
    } catch (e: any) {
      console.warn('failed to fetch indexed trout:', e);
      tokens = await fetchWeb3Trout(nftrout.value);
      mode.value = 'decentralized';
    }
    trout.value = Object.fromEntries(tokens.map((t) => [t.id, t]));
    isLoaded.value = true;
  };

  const updateFee = async (troutId: number, fee: bigint) => {
    trout.value[troutId].fee = fee;
  };

  const ownedTrout = computed(() =>
    Object.values(trout.value).filter(
      ({ owner }) => owner.toLowerCase() === eth.address?.toLowerCase(),
    ),
  );
  const farmedTrout = computed(() =>
    Object.values(trout.value).filter(({ fee }) => (fee ?? 0n) > 0n),
  );

  return { trout, ownedTrout, farmedTrout, fetchTrout, isLoaded, updateFee, mode };
});
