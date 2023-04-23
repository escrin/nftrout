import { BigNumber } from 'ethers';
import { NFTStorage, File } from 'nft.storage';

// @ts-expect-error missing declaration
import { main as fishdraw, draw_svg as toSvg } from './fishdraw';
import { Box, ESM } from './esm';

type TroutId = {
  chainId: number;
  tokenId: string;
};

type TroutAttributes = Partial<{
  genesis: boolean;
}>;

type TroutDescriptor = {
  left: TroutId | null;
  right: TroutId | null;
  self: TroutId;
  seed: Box;
  attributes?: TroutAttributes;
};

const MAX_SEED = 4294967295; // 2^32-1

async function main(): Promise<void> {
  let [
    _node,
    _thisfile,
    gasKey,
    nftStorageKey,
    chainIdStr,
    tokenId,
    leftTokenIdStr,
    leftCid,
    rightTokenIdStr,
    rightCid,
  ] = process.argv;
  if (!tokenId) throw new Error('missing tokenId');

  const chainId = Number.parseInt(chainIdStr, 10);
  let init = ESM.INIT_SAPPHIRE;
  if (chainId === 0x5afe) {
    init = ESM.INIT_SAPPHIRE_TESTNET;
  } else if (chainId === 1337 || chainId == 31337) {
    const { ATTOK_ADDR: attokAddr, LOCKBOX_ADDR: lockboxAddr } = process.env;
    if (!attokAddr) throw new Error('missing env: ATTOK_ADDR');
    if (!lockboxAddr) throw new Error('missing env: LOCKBOX_ADDR');
    init = {
      web3GatewayUrl: 'http://127.0.0.1:8545',
      attokAddr,
      lockboxAddr,
      debug: {
        nowrap: true,
      },
    };
  }

  const esm = new ESM(init, gasKey);

  const nftStorageClient = new NFTStorage({ token: nftStorageKey }); // TODO: use sealing

  const troutId = { chainId, tokenId };

  const randomInt = async (low: number, high: number) => {
    const range = high - low + 1;
    // This is not ideal. Node.js does not have a VRF and sealing doesn't exist yet.
    const seedMaterial = await esm.deriveKey(`nftrout/entropy/${tokenId}`);
    const randomNumber = BigNumber.from(`0x${Buffer.from(seedMaterial).toString('hex')}`);
    return randomNumber.mod(range).toNumber() + low; // This is also not ideal, but the input range is very big, so the probability of bias is low.
  };

  if (!leftCid || !rightCid) {
    return nftrout(esm, null, null, troutId, await randomInt(0, MAX_SEED), nftStorageClient);
  }

  const leftTokenId = Number.parseInt(leftTokenIdStr, 10);
  const rightTokenId = Number.parseInt(rightTokenIdStr, 10);
  const [left, right] = await Promise.all([
    fetchMetadata(esm, leftTokenId, leftCid),
    fetchMetadata(esm, rightTokenId, rightCid),
  ]);
  let seedBig = BigInt(left.seed) * 3n + BigInt(right.seed) * 5n + BigInt(await randomInt(0, 64));
  let seed = Number(seedBig % BigInt(MAX_SEED));
  return nftrout(esm, left.tokenId, right.tokenId, troutId, seed, nftStorageClient);
}

async function fetchMetadata(esm: ESM, tokenId: number, cid: string) {
  const res = await fetch(`https://nftstorage.link/ipfs/${cid}/metadata.json`);
  const troutMeta = await res.json();
  if (typeof troutMeta.seed === 'number') return troutMeta;
  const { seed } = JSON.parse(
    Buffer.from(await esm.decrypt(troutMeta.properties.seed, tokenId)).toString(),
  );
  troutMeta.seed = seed;
  return troutMeta;
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

async function nftrout<T extends TroutId | null>(
  esm: ESM,
  left: T,
  right: T,
  selfId: TroutId,
  seed: number,
  nftStorageClient: NFTStorage,
) {
  const { troutDescriptor, fishSvg } = await generate(esm, left, right, selfId, seed);
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
  await nftStorageClient.storeCar(car);
  console.log(token.ipnft);
}

async function generate<T extends TroutId | null>(
  esm: ESM,
  left: T,
  right: T,
  self: TroutId,
  seed: number,
): Promise<{ troutDescriptor: TroutDescriptor; fishSvg: string }> {
  const tokenId = BigNumber.from(self.tokenId).toNumber();
  const attributes: TroutAttributes = {
    genesis: tokenId <= 150,
  };
  const fishSvg = toSvg(fishdraw(seed), attributes.genesis ? 'rainbow' : 'normal');

  const troutDescriptor: TroutDescriptor = {
    left,
    right,
    self,
    attributes,
    seed: await esm.encrypt(new TextEncoder().encode(JSON.stringify({ seed })), tokenId),
  };

  return { troutDescriptor, fishSvg };
}

main().catch((e) => console.error(e));
