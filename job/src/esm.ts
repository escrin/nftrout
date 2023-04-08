import { randomBytes } from 'crypto';

import * as sapphire from '@oasisprotocol/sapphire-paratime';
// @ts-expect-error missing declaration
import deoxysii from 'deoxysii';
import * as dotenv from 'dotenv';
import { ethers } from 'ethers';
import createKeccakHash from 'keccak';

import { AttestationToken, AttestationTokenFactory, Lockbox, LockboxFactory } from '@escrin/evm';

import { decode, encode, memoizeAsync } from './utils';

type Registration = AttestationToken.RegistrationStruct;

export const LATEST_KEY_ID = 1;

dotenv.config();

const { ATTOK_ADDR, WEB3_GW_URL, LOCKBOX_ADDR } = process.env;
if (!ATTOK_ADDR) throw new Error('Attestation token addr not provided (missing ATTOK_ADDR)');
if (!LOCKBOX_ADDR) throw new Error('Lockbox addr not provided (missing LOCKBOX_ADDR)');
if (!WEB3_GW_URL) throw new Error('Web3 gateway URL not provided (missing WEB3_GW_URL)');

const getCipher = memoizeAsync(async (keyId: number) => {
  let key;
  if (keyId === 0) key = Buffer.alloc(deoxysii.KeySize, 42);
  else if (keyId === 1) key = await fetchKeySapphire();
  else throw new Error(`unknown key: ${keyId}`);
  return new deoxysii.AEAD(key);
});

const init = memoizeAsync(async () => {
  let [_node, _thisfile, gasKey] = process.argv;
  const provider = new ethers.providers.JsonRpcProvider(WEB3_GW_URL);
  const gasWallet = new ethers.Wallet(gasKey).connect(provider);
  const localWallet = sapphire.wrap(ethers.Wallet.createRandom().connect(provider));
  const attok = AttestationTokenFactory.connect(ATTOK_ADDR, localWallet).connect(gasWallet);
  const lockbox = LockboxFactory.connect(LOCKBOX_ADDR, localWallet);

  return {
    identity: localWallet.address,
    attok,
    lockbox,
    gasWallet,
    provider,
  };
});

async function fetchKeySapphire(): Promise<Uint8Array> {
  const { identity: registrant, attok, lockbox, gasWallet, provider } = await init();
  const oneHourFromNow = Math.floor(Date.now() / 1000) + 60 * 60;
  let currentBlock = await provider.getBlock('latest');
  const prevBlock = await provider.getBlock(currentBlock.number - 1);
  const registration: Registration = {
    baseBlockHash: prevBlock.hash,
    baseBlockNumber: prevBlock.number,
    expiry: oneHourFromNow,
    registrant,
    tokenExpiry: oneHourFromNow,
  };
  const quote = await mockQuote(registration);
  const tcbId = await sendAttestation(attok, quote, registration);
  return getOrCreateKey(lockbox, gasWallet, tcbId);
}

async function mockQuote(registration: Registration): Promise<Uint8Array> {
  const coder = ethers.utils.defaultAbiCoder;
  const measurementHash = '0xc275e487107af5257147ce76e1515788118429e0caa17c04d508038da59d5154'; // static random bytes. this is just a key in a key-value store.
  const regTypeDef =
    'tuple(uint256 baseBlockNumber, bytes32 baseBlockHash, uint256 expiry, uint256 registrant, uint256 tokenExpiry)'; // TODO: keep this in sync with the actual typedef
  const regBytesHex = coder.encode([regTypeDef], [registration]);
  const regBytes = Buffer.from(ethers.utils.arrayify(regBytesHex));
  return ethers.utils.arrayify(
    coder.encode(
      ['bytes32', 'bytes32'],
      [measurementHash, createKeccakHash('keccak256').update(regBytes).digest()],
    ),
  );
}

async function sendAttestation(
  attok: AttestationToken,
  quote: Uint8Array,
  reg: Registration,
): Promise<string> {
  const tx = await attok.attest(quote, reg, { gasLimit: 10_000_000 });
  console.log('attesting:', tx.hash);
  const receipt = await tx.wait();
  if (receipt.status !== 1) throw new Error('attestation tx failed');
  let tcbId = '';
  for (const event of receipt.events ?? []) {
    if (event.event !== 'Attested') continue;
    tcbId = event.args!.tcbId;
  }
  if (!tcbId) throw new Error('could not retrieve attestation id');
  console.log('received tcb:', tcbId);
  await waitForConfirmation(attok.provider, receipt);
  return tcbId;
}

async function waitForConfirmation(
  provider: ethers.providers.Provider,
  receipt: ethers.ContractReceipt,
): Promise<void> {
  const getCurrentBlock = () => provider.getBlock('latest');
  let currentBlock = await getCurrentBlock();
  while (currentBlock.number === receipt.blockNumber) {
    await new Promise((resolve) => setTimeout(resolve, 3_000));
    currentBlock = await getCurrentBlock();
  }
}

async function getOrCreateKey(
  lockbox: Lockbox,
  gasWallet: ethers.Wallet,
  tcbId: string,
): Promise<Uint8Array> {
  let key = await lockbox.callStatic.getKey(tcbId);
  if (!/^(0x)?0+$/.test(key)) return ethers.utils.arrayify(key);
  const tx = await lockbox
    .connect(gasWallet)
    .createKey(tcbId, randomBytes(32), { gasLimit: 10_000_000 });
  console.log('creating key:', tx.hash);
  const receipt = await tx.wait();
  await waitForConfirmation(lockbox.provider, receipt);
  key = await lockbox.callStatic.getKey(tcbId);
  return ethers.utils.arrayify(key);
}

export type Box = {
  keyId: number;
  nonce: string;
  data: string; // hex
};

export async function encrypt(data: Uint8Array): Promise<Box> {
  const keyId = LATEST_KEY_ID;
  const cipher = await getCipher(keyId);
  const nonce = randomBytes(deoxysii.NonceSize);
  return {
    keyId,
    nonce: encode(nonce),
    data: encode(cipher.encrypt(nonce, data)),
  };
}

export async function decrypt({ keyId, nonce, data }: Box): Promise<Uint8Array> {
  const cipher = await getCipher(keyId);
  return cipher.decrypt(decode(nonce), decode(data));
}
