const { randomInt } = require('crypto');
const fs = require('fs');

const { main: fishdraw, draw_svg: toSvg } = require('./fishdraw');

const MAX_SEED = 4294967295; // 2^32-1

let [_node, _thisfile, tokenId, inputsDir, outputsDir] = process.argv;

inputsDir = inputsDir ?? '/inputs';
outputsDir = outputsDir ?? '/outputs';

fs.access(`${inputsDir}/left.json`, (err) => {
  if (err) {
    nftrout(null, null, randomInt(0, MAX_SEED), tokenId);
    return;
  }
  const left = readMetadata(`${inputsDir}/left/trout.json`);
  const right = readMetadata(`${inputsDir}/right/trout.json`);
  let seed = BigInt(left.seed) * 3n + BigInt(right.seed) * 5n + BigInt(randomInt(0, 256));
  seed = Number(seed % BigInt(MAX_SEED));
  nftrout(left.id, right.id, seed, tokenId);
});

function readMetadata(fp) {
  return JSON.parse(fs.readFileSync(fp));
}

function nftrout(leftId, rightId, seed, tokenId) {
  const fishSvg = toSvg(fishdraw(seed));

  fs.writeFileSync(`${outputsDir}/trout.svg`, fishSvg);
  fs.writeFileSync(`${outputsDir}/trout.json`, JSON.stringify({
    left: leftId,
    right: rightId,
    tokenId,
    seed, // TODO: encrypt
  }));
}
