import { ethers } from 'ethers';
import { NFTStorage, File } from 'nft.storage';

import { NFTrout, NFTroutFactory } from '@escrin/nftrout-evm';

import { Box, Cipher } from './crypto.js';
import * as fish from './fishdraw.js';

export type Config = {
  network: { chainId: number; rpcUrl: string };
  identity: { registry: `0x${string}`; id: `0x${string}` };
  nftrout: string;
  nftStorageKey: string;
  signerKey: `0x${string}`;
};

type TokenId = number;
type Cid = string;

type TroutId = {
  chainId: number;
  tokenId: TokenId;
};

type TroutAttributes = Partial<{
  genesis: boolean;
  santa: boolean;
}>;

type TroutProperties = {
  left: TroutId | null;
  right: TroutId | null;
  self: TroutId;
  attributes: TroutAttributes;
  generations: Cid[];
} & ({ seed: Box } | { traits: Box });

type TroutParent = { id: TroutId; genotype: fish.Diploid };

const MAX_SEED = 4294967295; // 2^32-1

export class Spawner {
  public static async get(config: Config, cipher: Cipher): Promise<Spawner> {
    const nftStorageClient = new NFTStorage({ token: config.nftStorageKey });
    return new Spawner(
      config.network,
      new ethers.Wallet(config.signerKey).connect(
        new ethers.JsonRpcProvider(config.network.rpcUrl, undefined, {
          staticNetwork: new ethers.Network(
            chainIdToChainName(config.network.chainId),
            config.network.chainId,
          ),
        }),
      ),
      config.nftrout,
      cipher,
      nftStorageClient,
    );
  }

  #nftrout: NFTrout;
  #cidCache: Map<TokenId, { cid: Cid; posted: boolean; props?: TroutProperties }> = new Map();

  #batchSize = 10;

  constructor(
    public readonly network: { chainId: number },
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

    let taskResults: Array<[TokenId, Cid]> = tasks.post;

    // TODO: parallelize anti-chains
    let toSpawn = tasks.spawn.slice(0, 20);
    console.debug('preparing to spawn', toSpawn);
    for (let i = 0; i < toSpawn.length; i += this.#batchSize) {
      for (const tokenId of toSpawn.slice(i, i + this.#batchSize)) {
        try {
          const res = await this.spawnTrout(tokenId);
          this.#cidCache.set(tokenId, { ...res, posted: false });
          taskResults.push([tokenId, res.cid]);
        } catch (e: any) {
          console.error(`failed to spawn trout ${tokenId}`, e);
          return;
        }
      }

      taskResults = taskResults.sort(([a], [b]) => a - b).slice(0, this.#batchSize); // Task results must be sorted by task ID.
      if (taskResults.length === 0) return;
      const encodedCids = ethers.AbiCoder.defaultAbiCoder().encode(
        ['string[]'],
        [taskResults.map(([_, cid]) => cid)],
      );
      const submittedTaskIds = taskResults.map(([id]) => id);
      console.debug('submitting', submittedTaskIds);
      try {
        const tx = await this.#nftrout.acceptTaskResults(
          submittedTaskIds,
          new Uint8Array(),
          encodedCids,
          {
            gasLimit: Math.abs(this.network.chainId - 23294) <= 1 ? 15_000_000 : undefined,
          },
        );
        console.info(tx.hash);
        const receipt = await tx.wait(1);
        if (!receipt || receipt.status !== 1) throw new Error('failed to accept tasks');
        for (const [id, cid] of taskResults) {
          this.#cidCache.set(id, { cid, posted: true });
        }
      } catch (e: any) {
        console.error('failed to post task results:', e);
      }
      taskResults = [];
    }
  }

  private async getNewTasks(): Promise<{ spawn: TokenId[]; post: Array<[TokenId, Cid]> }> {
    const totalSupply = Number(await this.#nftrout.totalSupply());
    const needsPosting: Array<[TokenId, Cid]> = [];
    const needsChecking: TokenId[] = [];
    for (let tokenId = 1; tokenId <= totalSupply; tokenId++) {
      const { cid, posted } = this.#cidCache.get(tokenId) ?? { cid: undefined, posted: false };
      if (posted) continue;
      if (cid) needsPosting.push([tokenId, cid]);
      else needsChecking.push(tokenId);
    }
    const needsSpawning: TokenId[] = [];
    const batchSize = 5;
    for (let i = 0; i < needsChecking.length; i += batchSize) {
      await Promise.all(
        needsChecking.slice(i, i + batchSize).map(async (tokenId) => {
          try {
            const cid = await this.getTroutCid(tokenId);
            if (cid) {
              const props = await this.fetchProps(tokenId, cid);
              if (props && 'traits' in props) {
                this.#cidCache.set(tokenId, { cid, posted: true, props });
                return;
              }
              console.debug(tokenId, 'needs spawning');
              this.#cidCache.set(tokenId, { cid, posted: false, props });
              needsSpawning.push(tokenId);
            } else needsSpawning.push(tokenId);
          } catch (e: any) {
            console.error(`failed to check CID of trout ${tokenId}:`, e);
          }
        }),
      );
    }
    return { spawn: needsSpawning.sort((a, b) => a - b), post: needsPosting };
  }

  private async getTroutCid(tokenId: TokenId): Promise<Cid | undefined> {
    let { cid } = this.#cidCache.get(tokenId) ?? {};
    if (cid) return cid;
    const uri = await this.#nftrout.tokenURI(tokenId);
    if (uri === 'ipfs://') return undefined;
    return uri.replace('ipfs://', '');
  }

  private async spawnTrout(selfTokenId: TokenId): Promise<{ cid: Cid; props: TroutProperties }> {
    console.log('spawning', selfTokenId);
    const { left, right } = await this.#nftrout.parents(selfTokenId);

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
    const troutId = { tokenId: selfTokenId, chainId: this.network.chainId };

    const randomInt = async (low: number, high: number) => {
      const range = BigInt(high - low + 1);
      // This is not ideal. Node.js does not have a VRF and sealing doesn't exist yet.
      const chainId = this.network.chainId;
      const seedMaterial = await this.cipher.deriveKey(`nftrout/entropy/${chainId}/${selfTokenId}`);
      const randomNumber = uint8ArrayToBigIntLE(seedMaterial);
      return Number(randomNumber % range) + low;
    };

    if (!leftCid || !rightCid) {
      return this.doSpawnTrout(null, null, troutId, await randomInt(0, MAX_SEED));
    }

    const [leftParent, rightParent] = await Promise.all([
      this.fetchParent(leftTokenId, leftCid),
      this.fetchParent(rightTokenId, rightCid),
    ]);
    let seed = await randomInt(0, MAX_SEED);
    return this.doSpawnTrout(leftParent, rightParent, troutId, seed);
  }

  private async doSpawnTrout<T extends TroutParent | null>(
    left: T,
    right: T,
    selfId: TroutId,
    seed: number,
  ): Promise<{ cid: Cid; props: TroutProperties }> {
    const { troutDescriptor, fishSvg } = await this.generate(left, right, selfId, seed);
    const name = troutName(selfId);
    const { token, car } = await NFTStorage.encodeNFT({
      name,
      description: `${name} ${
        left && right
          ? `was born to ${troutName(left.id)} and ${troutName(right.id)}`
          : troutDescriptor.attributes?.genesis
          ? 'has existed since before the dawn of time'
          : 'was spontaneously generated'
      }.`,
      image: new File([fishSvg], 'trout.svg', { type: 'image/svg+xml' }),
      properties: troutDescriptor,
    });
    await this.nftStorage.storeCar(car);
    return { cid: token.ipnft, props: troutDescriptor };
  }

  private async generate<T extends TroutParent | null>(
    left: T,
    right: T,
    self: TroutId,
    seed: number,
  ): Promise<{ troutDescriptor: TroutProperties; fishSvg: string }> {
    const tokenId = Number(ethers.getBigInt(self.tokenId));

    const attributes: TroutAttributes = {
      genesis: tokenId <= (self.chainId === 0x5aff || self.chainId === 0x5afe ? 137 : 139),
      santa: self.chainId === 0x5afe && tokenId > 235 && tokenId < 242,
    };

    let trout: fish.Organism;
    if (left === null || right === null) {
      trout = fish.spawn(seed);
      if (attributes.genesis) {
        trout.genotype[0].color = 'rainbow';
        trout.genotype[1].color = 'rainbow';
        trout.phenotype.color = 'rainbow';
      }
    } else {
      trout = fish.breed(left.genotype, right.genotype, seed);
    }
    const fishSvg = fish.draw(trout.phenotype, attributes);

    const pastSelfCid = await this.getTroutCid(tokenId);
    let generations: Cid[] = [];
    if (pastSelfCid) {
      const pastProps = await this.fetchProps(tokenId, pastSelfCid);
      generations = pastProps.generations ?? [];
      generations.push(pastSelfCid);
    }

    const troutDescriptor: TroutProperties = {
      left: left?.id ?? null,
      right: right?.id ?? null,
      self,
      attributes,
      traits: await this.cipher.encrypt(
        new TextEncoder().encode(
          JSON.stringify({
            seed,
            ...trout,
          }),
        ),
        tokenId,
      ),
      generations,
    };

    return { troutDescriptor, fishSvg };
  }

  private async fetchParent(tokenId: number, cid: string): Promise<TroutParent> {
    const props = await this.fetchProps(tokenId, cid);
    if (!('traits' in props)) throw new Error(`encountered legacy trout ${tokenId}`);
    const traitsJson = await this.cipher.decrypt(props.traits, tokenId);
    const { genotype } = JSON.parse(new TextDecoder().decode(traitsJson)) as fish.Organism;
    return { id: props.self, genotype };
  }

  private async fetchProps(tokenId: number, cid: string): Promise<TroutProperties> {
    console.debug('fetching props for', tokenId, 'from', cid);
    for (let i = 0; i < 3; i++) {
      try {
        const cached = this.#cidCache.get(tokenId);
        if (cached && cached.props) return cached.props;
        const res = await fetch(`https://nftstorage.link/ipfs/${cid}/metadata.json`);
        // TODO: verify CID
        const resText = await res.text();
        let props: TroutProperties;
        try {
          props = JSON.parse(resText).properties;
        } catch (e: any) {
          console.error('failed to parse nft metadata response:', resText);
          throw e;
        }
        this.#cidCache.set(tokenId, { cid, props, posted: true });
        return props;
      } catch (e: any) {
        console.error('failed to fetch props for', tokenId, 'at', cid, ':', e);
        await new Promise((resolve) => setTimeout(resolve, 1_000));
      }
    }
    throw new Error(`failed to fetch props for trout ${tokenId}`);
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

function uint8ArrayToBigIntLE(uint8Array: Uint8Array): bigint {
  let result = BigInt(0);
  const length = uint8Array.length;

  for (let i = length - 1; i >= 0; i--) {
    result <<= BigInt(8);
    result += BigInt(uint8Array[i]);
  }

  return result;
}
