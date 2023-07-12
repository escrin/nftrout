import { EscrinRunner } from '@escrin/runner';
import { ethers } from 'ethers';
import { NFTStorage, File } from 'nft.storage';

import { NFTrout, NFTroutFactory } from '@escrin/nftrout-evm';
// @ts-expect-error missing declaration
import { address as nftroutSapphireTestnet } from '@escrin/nftrout-evm/deployments/sapphire-testnet';
// @ts-expect-error missing declaration
import { address as nftroutSapphireMainnet } from '@escrin/nftrout-evm/deployments/sapphire-mainnet';

import { Box, Cipher } from './crypto.js';
// @ts-expect-error missing declaration
import { main as fishdraw, draw_svg as toSvg } from './fishdraw.cjs';

type TokenId = number;
type CID = string;

type TroutId = {
  chainId: number;
  tokenId: TokenId;
};

type TroutAttributes = Partial<{
  genesis: boolean;
}>;

type TroutMeta = {
  name: string;
  description: string;
  image: { '/': string };
  'metadata.json': { '/': string };
  type: 'nft';
  properties: TroutDescriptor;
};

type TroutDescriptor = {
  left: TroutId | null;
  right: TroutId | null;
  self: TroutId;
  seed: Box;
  attributes?: TroutAttributes;
};

const MAX_SEED = 4294967295; // 2^32-1

const spawners: {
  local?: Spawner;
  'sapphire-mainnet'?: Spawner;
  'sapphire-testnet'?: Spawner;
} = {};

export type Config = {
  network: keyof typeof spawners;
  nftStorageKey: string;
  signerKey: string;
};

export class Spawner {
  public static async get(rnr: EscrinRunner, config: Config): Promise<Spawner> {
    if (!spawners[config.network]) {
      const cipher =
        config.network === 'local'
          ? await Cipher.createRandom()
          : new Cipher(await rnr.getKey(config.network, 'omni'));
      const nftStorageClient = new NFTStorage({ token: config.nftStorageKey }); // TODO: use sealing
      let nftroutAddr = '';
      let gateway = '';
      if (config.network === 'sapphire-testnet') {
        nftroutAddr = nftroutSapphireTestnet;
        gateway = 'https://testnet.sapphire.oasis.dev';
      } else if (config.network === 'sapphire-mainnet') {
        nftroutAddr = nftroutSapphireMainnet;
        gateway = 'https://sapphire.oasis.io';
      } else if (config.network === 'local') {
        nftroutAddr = '0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512';
        gateway = 'http://127.0.0.1:8545';
      }
      spawners[config.network] = new Spawner(
        config.network,
        new ethers.Wallet(config.signerKey).connect(new ethers.JsonRpcProvider(gateway)),
        nftroutAddr,
        cipher,
        nftStorageClient,
      );
    }
    return spawners[config.network]!;
  }

  #nftrout: NFTrout;
  #cidCache: Map<TokenId, { cid: CID; posted: boolean }> = new Map();

  #batchSize = 30;

  constructor(
    public readonly network: keyof typeof spawners,
    signer: ethers.Signer,
    nftroutAddr: string,
    private readonly cipher: Cipher,
    private readonly nftStorage: NFTStorage,
  ) {
    this.#nftrout = NFTroutFactory.connect(nftroutAddr, signer);
  }

  async spawn(): Promise<void> {
    const tasks = await this.getNewTasks();

    if (tasks.spawn.length === 0 && tasks.post.length === 0) return;

    let taskResults: Array<[TokenId, CID]> = tasks.post;

    await Promise.all(
      tasks.spawn.map(async (tokenId) => {
        try {
          const cid = await this.spawnTrout(tokenId);
          this.#cidCache.set(tokenId, { cid, posted: false });
          taskResults.push([tokenId, cid]);
        } catch (e: any) {
          console.error(e);
          return;
        }
      }),
    );

    taskResults = taskResults.sort(([a], [b]) => a - b).slice(0, this.#batchSize); // Task results must be sorted by task ID.
    if (taskResults.length === 0) return;
    const encodedCids = ethers.AbiCoder.defaultAbiCoder().encode(
      ['string[]'],
      [taskResults.map(([_, cid]) => cid)],
    );
    const submittedTaskIds = taskResults.map(([id]) => id);
    try {
      const tx = await this.#nftrout.acceptTaskResults(
        submittedTaskIds,
        new Uint8Array(),
        encodedCids,
        {
          gasLimit: this.network.startsWith('sapphire') ? 30_000_000 : undefined,
        },
      );
      console.log(tx.hash);
      const receipt = await tx.wait();
      if (!receipt || receipt.status !== 1) throw new Error('failed to accept tasks');
      for (const [id, cid] of taskResults) {
        this.#cidCache.set(id, { cid, posted: true });
      }
    } catch (e: any) {
      console.error(e);
    }
  }

  private async getNewTasks(): Promise<{ spawn: TokenId[]; post: Array<[TokenId, CID]> }> {
    const totalSupply = Number(await this.#nftrout.totalSupply());
    const needsPosting: Array<[TokenId, CID]> = [];
    const needsChecking: TokenId[] = [];
    for (let tokenId = 1; tokenId <= totalSupply; tokenId++) {
      const { cid, posted } = this.#cidCache.get(tokenId) ?? { cid: undefined, posted: false };
      if (posted) continue;
      if (cid) needsPosting.push([tokenId, cid]);
      else needsChecking.push(tokenId);
    }
    const needsSpawning: TokenId[] = [];
    await Promise.all(
      needsChecking.map(async (tokenId) => {
        try {
          const cid = await this.getTroutCid(tokenId);
          if (cid) {
            this.#cidCache.set(tokenId, { cid, posted: true });
            return;
          } else needsSpawning.push(tokenId);
        } catch (e: any) {
          console.error(e);
        }
      }),
    );
    return { spawn: needsSpawning, post: needsPosting };
  }

  private async getTroutCid(tokenId: TokenId): Promise<CID | undefined> {
    let { cid } = this.#cidCache.get(tokenId) ?? {};
    if (cid) return cid;
    const uri = await this.#nftrout.tokenURI(tokenId);
    if (uri === 'ipfs://') return undefined;
    return cid;
  }

  private async spawnTrout(tokenId: TokenId): Promise<CID> {
    const { left, right } = await this.#nftrout.parents(tokenId);

    let leftCid = '';
    let leftTokenId = 0;
    let rightCid = '';
    let rightTokenId = 0;

    if (left !== 0n && right !== 0n) {
      leftTokenId = Number(left);
      rightTokenId = Number(right);
      const [maybeLeftCid, maybeRightCid] = await Promise.all([
        this.getTroutCid(leftTokenId),
        this.getTroutCid(rightTokenId),
      ]);
      if (maybeLeftCid === undefined) throw new Error(`missing CID for token ${left} (left)`);
      if (maybeRightCid === undefined) throw new Error(`missing CID for token ${left} (left)`);
      leftCid = maybeLeftCid;
      rightCid = maybeRightCid;
    }
    const troutId = { tokenId, chainId: networkNameToChainId(this.network) };

    const randomInt = async (low: number, high: number) => {
      const range = BigInt(high - low + 1);
      // This is not ideal. Node.js does not have a VRF and sealing doesn't exist yet.
      const chainId = networkNameToChainId(this.network);
      const seedMaterial = await this.cipher.deriveKey(`nftrout/entropy/${chainId}/${tokenId}`);
      const randomNumber = uint8ArrayToBigIntLE(seedMaterial);
      return Number(randomNumber % range) + low;
    };

    if (!leftCid || !rightCid) {
      return this.doSpawnTrout(null, null, troutId, await randomInt(0, MAX_SEED));
    }

    const [leftMeta, rightMeta] = await Promise.all([
      this.fetchMetadata(leftTokenId, leftCid),
      this.fetchMetadata(rightTokenId, rightCid),
    ]);
    let seedBig =
      BigInt(leftMeta.seed) * 3n + BigInt(rightMeta.seed) * 5n + BigInt(await randomInt(0, 64));
    let seed = Number(seedBig % BigInt(MAX_SEED));
    return this.doSpawnTrout(leftMeta.properties.self, rightMeta.properties.self, troutId, seed);
  }

  private async doSpawnTrout<T extends TroutId | null>(
    left: T,
    right: T,
    selfId: TroutId,
    seed: number,
  ) {
    const { troutDescriptor, fishSvg } = await this.generate(left, right, selfId, seed);
    const name = troutName(selfId);
    const { token, car } = await NFTStorage.encodeNFT({
      name,
      description: `${name} ${
        left && right
          ? `was born to ${troutName(left)} and ${troutName(right)}`
          : troutDescriptor.attributes?.genesis
          ? 'has existed since before the dawn of time'
          : 'was spontaneously generated'
      }.`,
      image: new File([fishSvg], 'trout.svg', { type: 'image/svg+xml' }),
      properties: troutDescriptor,
    });
    console.log('storing car');
    await this.nftStorage.storeCar(car);
    return token.ipnft;
  }

  private async generate<T extends TroutId | null>(
    left: T,
    right: T,
    self: TroutId,
    seed: number,
  ): Promise<{ troutDescriptor: TroutDescriptor; fishSvg: string }> {
    const tokenId = Number(ethers.getBigInt(self.tokenId));
    const attributes: TroutAttributes = {
      genesis: tokenId <= (self.chainId === 0x5aff || self.chainId === 0x5afe ? 137 : 139),
    };
    const fishSvg = toSvg(fishdraw(seed), attributes.genesis ? 'rainbow' : 'normal');

    const troutDescriptor: TroutDescriptor = {
      left,
      right,
      self,
      attributes,
      seed: await this.cipher.encrypt(new TextEncoder().encode(JSON.stringify({ seed })), tokenId),
    };

    return { troutDescriptor, fishSvg };
  }

  private async fetchMetadata(tokenId: number, cid: string): Promise<TroutMeta & { seed: number }> {
    const res = await fetch(`https://nftstorage.link/ipfs/${cid}/metadata.json`);
    // TODO: verify CID
    const troutMeta = await res.json();
    if (typeof troutMeta.seed === 'number') return troutMeta;
    const seedJson = await this.cipher.decrypt(troutMeta.properties.seed, tokenId);
    const { seed } = JSON.parse(new TextDecoder().decode(seedJson));
    troutMeta.seed = seed;
    return troutMeta;
  }
}

function troutName(id: TroutId): string {
  return `${chainIdToChainName(id.chainId)} TROUT #${id.tokenId}`;
}

function chainIdToChainName(chainId: number) {
  if (chainId === 0x5aff) return 'Sapphire Testnet';
  if (chainId === 0x5afe) return 'Sapphire';
  if (chainId === 3141) return 'Hyperspace';
  if (chainId === 314) return 'Filecoin';
  if (chainId === 1337) return 'Ganache';
  if (chainId === 31337) return 'Hardhat';
  throw new Error(`unrecognized chainid: ${chainId}`);
}

function networkNameToChainId(networkName: keyof typeof spawners): number {
  if (networkName === 'sapphire-testnet') return 0x5aff;
  if (networkName === 'sapphire-mainnet') return 0x5afe;
  if (networkName === 'local') return 31337;
  throw new Error(`unrecgnized newtork: ${networkName}`);
}

function uint8ArrayToBigIntLE(uint8Array: Uint8Array): bigint {
  let result = BigInt(0);
  const length = uint8Array.length;

  for (let i = length - 1; i >= 0; i--) {
    result <<= BigInt(8);
    result += BigInt(uint8Array[i]);
  }

  return result;
}
