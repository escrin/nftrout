import { CarBufferWriter } from '@ipld/car';
import { ethers } from 'ethers';
import { CID } from 'multiformats';
import { CarReader, NFTStorage, File } from 'nft.storage';

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
  version?: number;
  left: TroutId | null;
  right: TroutId | null;
  self: TroutId;
  attributes: TroutAttributes;
  generations: Cid[];
  traits: Box;
};

type TroutParent = { id: TroutId; genotype: fish.Diploid };

const CURRENT_VERSION = 3;
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
  #cidCache: Map<TokenId, { cid: Cid; props?: TroutProperties }> = new Map();

  #batchSize = 30;

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
    if (tasks.length === 0) return;

    let taskResults: Array<[TokenId, Cid]> = [];

    // TODO: parallelize anti-chains
    for (let i = 0; i < tasks.length; i += this.#batchSize) {
      for (const tokenId of tasks.slice(i, i + this.#batchSize)) {
        try {
          const res = await this.spawnTrout(tokenId);
          this.#cidCache.set(tokenId, res);
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
      // console.debug('submitting', submittedTaskIds);
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
          this.#cidCache.set(id, { ...(this.#cidCache.get(id) ?? {}), cid });
        }
      } catch (e: any) {
        console.error('failed to post task results:', e);
      }
      taskResults = [];
    }
  }

  private async getNewTasks(): Promise<TokenId[]> {
    const needsSpawning = async (tokenId: number, cid?: Cid) => {
      if (!cid) return true;
      const props = await this.fetchProps(tokenId, cid);
      this.#cidCache.set(tokenId, { cid, props });
      const version = props?.version ?? -1;
      return version !== CURRENT_VERSION;
    };

    const totalSupply = Number(await this.#nftrout.totalSupply());

    let a = 1;
    let b = a + totalSupply;
    while (a !== b) {
      const mp = a + Math.floor((b - a) / 2);
      await retry(async () => {
        const cid = await this.getTroutCid(mp);
        if (await needsSpawning(mp, cid)) {
          b = mp;
        } else {
          a = mp + 1;
        }
      });
    }

    const toSpawn = [];
    for (let i = a; i <= totalSupply; i++) {
      toSpawn.push(i);
    }
    return toSpawn;
  }

  private async getTroutCid(tokenId: TokenId): Promise<Cid | undefined> {
    let { cid } = this.#cidCache.get(tokenId) ?? {};
    if (cid) return cid;
    const uri = await this.#nftrout.tokenURI(tokenId);
    if (uri === 'ipfs://') return undefined;
    return uri.replace('ipfs://', '');
  }

  private async spawnTrout(selfTokenId: TokenId): Promise<{ cid: Cid; props: TroutProperties }> {
    // console.debug('spawning', selfTokenId);
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
    await this.storeNft(car, token.ipnft);
    return { cid: token.ipnft, props: troutDescriptor };
  }

  private async storeNft(car: CarReader, ipnft: string): Promise<void> {
    const storeCarP = this.nftStorage.storeCar(car);

    let carSize = 0;
    for await (const { bytes } of car.blocks()) {
      carSize += bytes.length;
    }
    const upgradeCid = (cid: any) => new CID(cid.version, cid.code, cid.multihash, cid.bytes);
    const writer = CarBufferWriter.createWriter(new Uint8Array(carSize + 4096), {
      roots: (await car.getRoots()).map(upgradeCid),
    });
    for await (const { cid, bytes } of car.blocks()) {
      writer.write({ cid: upgradeCid(cid), bytes });
    }
    const body = new FormData();
    body.append('file', new Blob([writer.close({ resize: true })], { type: 'application/car' }));
    const localPinCarP = fetch('http://127.0.0.1:5001/api/v0/dag/import', {
      method: 'POST',
      body,
    });

    const [storeCarResult, localPinResult] = await Promise.allSettled([storeCarP, localPinCarP]);
    if (localPinResult.status === 'rejected') {
      console.error('ERROR: failed to locally pin: ', localPinResult.reason);
    } else if (!localPinResult.value.ok) {
      console.error('ERROR: failed to locally pin: ', await localPinResult.value.text());
    } else {
      const {
        Root: {
          Cid: { '/': pinnedCid },
          PinErrorMsg: pinError,
        },
      } = await localPinResult.value.json();
      if (pinError) throw new Error(`failed to pin imported CAR: ${pinError}`);
      if (pinnedCid !== ipnft)
        throw new Error(`pinned CID ${pinnedCid} did not match token CID ${ipnft}`);
    }
    if (storeCarResult.status === 'rejected') {
      throw new Error(`failed to store CAR: ${JSON.stringify(storeCarResult.reason)}`);
    }
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
      version: CURRENT_VERSION,
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
    const traitsJson = await this.cipher.decrypt(props.traits, tokenId);
    const { genotype } = JSON.parse(new TextDecoder().decode(traitsJson)) as fish.Organism;
    return { id: props.self, genotype };
  }

  private async fetchProps(tokenId: number, cid: string): Promise<TroutProperties> {
    // console.debug('fetching props for', tokenId, 'from', cid);
    return retry(async () => {
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
      this.#cidCache.set(tokenId, { cid, props });
      return props;
    });
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

async function retry<T>(f: () => Promise<T>, times = 3, delay = 1_000): Promise<T> {
  let lastError;
  for (let i = 0; i < times; i++) {
    try {
      return await f();
    } catch (e: any) {
      lastError = e;
      console.error(e);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }
  throw lastError;
}
