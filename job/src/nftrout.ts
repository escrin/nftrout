import { randomInt } from 'crypto';
import { promises as fs } from 'fs';

import { BigNumber } from 'ethers';

// @ts-expect-error missing declaration
import { main as fishdraw, draw_svg as toSvg } from './fishdraw';
import { Box, ESM } from './esm';

type TroutId = {
  chainId: number;
  tokenId: string;
};

type TroutAttributes = Partial<{
  genesis: boolean;
  incubation: 'fast' | 'slow' | 'normal';
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
  let [_node, _thisfile, gasKey, chainIdStr, tokenId, inputsDir, outputsDir] = process.argv;
  if (!tokenId) throw new Error('missing tokenId');
  inputsDir = inputsDir ?? '/inputs';
  outputsDir = outputsDir ?? '/outputs';

  const chainId = Number.parseInt(chainIdStr, 10);

  const esm = new ESM(chainId === 0x5afe ? ESM.INIT_SAPPHIRE : ESM.INIT_SAPPHIRE_TESTNET, gasKey);

  const troutId = { chainId, tokenId };

  const leftPath = `${inputsDir}/left/trout.json`;
  const rightPath = `${inputsDir}/right/trout.json`;
  try {
    await Promise.all([fs.access(leftPath), fs.access(rightPath)]);
  } catch {
    return nftrout(esm, null, null, troutId, randomInt(0, MAX_SEED), outputsDir);
  }

  const left = await readMetadata(esm, leftPath);
  const right = await readMetadata(esm, rightPath);
  let seedBig = BigInt(left.seed) * 3n + BigInt(right.seed) * 5n + BigInt(randomInt(0, 64));
  let seed = Number(seedBig % BigInt(MAX_SEED));
  return nftrout(esm, left.tokenId, right.tokenId, troutId, seed, outputsDir);
}

async function readMetadata(esm: ESM, filePath: string) {
  const troutMeta = JSON.parse(await fs.readFile(filePath, 'utf8'));
  if (typeof troutMeta.seed === 'number') return troutMeta;
  const { seed } = JSON.parse(Buffer.from(await esm.decrypt(troutMeta.seed)).toString());
  troutMeta.seed = seed;
  return troutMeta;
}

async function nftrout<T extends TroutId | null>(
  esm: ESM,
  left: T,
  right: T,
  selfId: TroutId,
  seed: number,
  outputsDir: string,
) {
  const { troutDescriptor, fishSvg } = await generate(esm, left, right, selfId, seed);
  await Promise.all([
    fs.writeFile(`${outputsDir}/trout.svg`, fishSvg),
    fs.writeFile(`${outputsDir}/trout.json`, JSON.stringify(troutDescriptor)),
  ]);
}

async function generate<T extends TroutId | null>(
  esm: ESM,
  left: T,
  right: T,
  self: TroutId,
  seed: number,
): Promise<{ troutDescriptor: TroutDescriptor; fishSvg: string }> {
  // These were the trout that incubated within a normal amount of time before the encubation retrier started to exist.
  const FAST_INCUBATORS = new Set([151, 152, 158, 159, 171, 176, 177, 180]);
  const INCUBATION_SPEED_CUTOFF = 181;

  const tokenId = BigNumber.from(self.tokenId).toNumber();
  const attrs: TroutAttributes = {
    genesis: tokenId <= 150,
    incubation:
      tokenId <= INCUBATION_SPEED_CUTOFF
        ? FAST_INCUBATORS.has(tokenId)
          ? 'fast'
          : 'slow'
        : 'normal',
  };
  const fishSvg = toSvg(fishdraw(seed), attrs.genesis ? 'rainbow' : 'normal');

  const troutDescriptor: TroutDescriptor = {
    left,
    right,
    self,
    seed: await esm.encrypt(new TextEncoder().encode(JSON.stringify({ seed }))),
  };

  return { troutDescriptor, fishSvg };
}

main().catch((e) => console.error(e));
