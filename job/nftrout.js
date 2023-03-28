const { randomBytes, randomInt } = require("crypto");
const fs = require("fs");

const deoxysii = require("deoxysii");

const { main: fishdraw, draw_svg: toSvg } = require("./fishdraw");

const ENCODING = "base64url";
const MAX_SEED = 4294967295; // 2^32-1

const LATEST_KEY_ID = 0;

const encode = (b) => Buffer.from(b).toString(ENCODING);
const decode = (s) => Buffer.from(s, ENCODING);

const getCipher = memoizeAsync(async (keyId) => {
  let key;
  if (keyId === 0) key = Buffer.alloc(deoxysii.KeySize, 42);
  else throw new Error(`unknown key: ${keyId}`);
  return new deoxysii.AEAD(key);
});

let [_node, _thisfile, tokenId, inputsDir, outputsDir] = process.argv;

if (tokenId === undefined) throw new Error("missing tokenId");

inputsDir = inputsDir ?? "/inputs";
outputsDir = outputsDir ?? "/outputs";

fs.access(`${inputsDir}/left/trout.json`, async (err) => {
  if (err) {
    nftrout(null, null, randomInt(0, MAX_SEED), tokenId);
    return;
  }
  const left = await readMetadata(`${inputsDir}/left/trout.json`);
  const right = await readMetadata(`${inputsDir}/right/trout.json`);
  let seed =
    BigInt(left.seed) * 3n + BigInt(right.seed) * 5n + BigInt(randomInt(0, 64));
  seed = Number(seed % BigInt(MAX_SEED));
  await nftrout(left.tokenId, right.tokenId, seed, tokenId);
});

async function readMetadata(fp) {
  const troutMeta = JSON.parse(fs.readFileSync(fp));
  if (typeof troutMeta.seed === "number") return troutMeta;
  const { keyId, nonce, data } = troutMeta.seed;
  const cipher = await getCipher(keyId);
  const plaintext = Buffer.from(cipher.decrypt(decode(nonce), decode(data)));
  const { seed } = JSON.parse(plaintext);
  troutMeta.seed = seed;
  return troutMeta;
}

async function nftrout(leftId, rightId, seed, tokenId) {
  const fishSvg = toSvg(fishdraw(seed));

  fs.writeFileSync(`${outputsDir}/trout.svg`, fishSvg);

  const keyId = LATEST_KEY_ID;
  const cipher = await getCipher(keyId);
  const nonce = randomBytes(deoxysii.NonceSize);

  fs.writeFileSync(
    `${outputsDir}/trout.json`,
    JSON.stringify({
      left: leftId,
      right: rightId,
      tokenId,
      seed: {
        keyId,
        nonce: encode(nonce),
        data: encode(
          cipher.encrypt(nonce, Buffer.from(JSON.stringify({ seed })))
        ),
      },
    })
  );
}

function memoizeAsync(fn) {
  const cache = new Map();
  const inProgress = new Map();
  return async function memoized(...args) {
    const key = JSON.stringify(args);
    if (cache.has(key)) return cache.get(key);
    if (inProgress.has(key)) return await inProgress.get(key);
    const promise = fn(...args);
    inProgress.set(key, promise);
    try {
      const result = await promise;
      cache.set(key, result);
      return result;
    } catch (err) {
      throw err;
    } finally {
      inProgress.delete(key);
    }
  };
}
