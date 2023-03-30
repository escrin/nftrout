import { randomBytes } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

import * as sapphire from '@oasisprotocol/sapphire-paratime';
// @ts-expect-error missing declaration
import deoxysii from 'deoxysii';
import ethers, { BytesLike } from 'ethers';
import createKeccakHash from 'keccak';

import { AttestationToken, AttestationTokenFactory, LockboxFactory } from '@escrin/evm';

import { decode, encode, memoizeAsync } from './utils';

type Registration = AttestationToken.RegistrationStruct;

export const LATEST_KEY_ID = 0;

const getCipher = memoizeAsync(async (keyId: number) => {
  let key;
  if (keyId === 0) key = Buffer.alloc(deoxysii.KeySize, 42);
  else if (keyId === 1) key = await fetchKeySapphire();
  else throw new Error(`unknown key: ${keyId}`);
  return new deoxysii.AEAD(key);
});

const init = memoizeAsync(async () => {
  const { ATTOK_ADDR, WEB3_GW_URL, LOCKBOX_ADDR } = process.env;
  if (!ATTOK_ADDR) throw new Error('Attestation token addr not provided (missing ATTOK_ADDR)');
  if (!LOCKBOX_ADDR) throw new Error('Lockbox addr not provided (missing LOCKBOX_ADDR)');
  if (!WEB3_GW_URL) throw new Error('Web3 gateway url not provided (missing WEB3_GW_URL)');

  const gasKey = await fs.readFile('/opt/esm/gas_wallet.json');
  const provider = new ethers.providers.JsonRpcProvider(WEB3_GW_URL);
  const gasWallet = new ethers.Wallet(gasKey).connect(provider);
  const localWallet = sapphire.wrap(ethers.Wallet.createRandom().connect(provider));
  const attok = AttestationTokenFactory.connect(ATTOK_ADDR, localWallet).connect(gasWallet);
  const lockbox = LockboxFactory.connect(LOCKBOX_ADDR, localWallet);

  return {
    identity: localWallet.address,
    attok,
    lockbox,
  };
});

async function fetchKeySapphire(): Promise<Uint8Array> {
  const { identity: registrant, attok, lockbox } = await init();
  const oneHourFromNow = Math.floor(Date.now() / 1000) + 60 * 60;
  const registration = {
    currentBlockHash: '',
    currentBlockNumber: 0,
    expiry: oneHourFromNow,
    registrant,
    tokenExpiry: oneHourFromNow,
  };
  const quote = await mockQuote(registration);
  const tx = await attok.attest(quote, registration);
  console.log('attested in', tx);
  const receipt = await tx.wait();
  if (receipt.status !== 1) throw new Error('attestation tx failed');
  let tcbId = '';
  for (const event of receipt.events ?? []) {
    if (event.event !== 'Attested') continue;
    tcbId = event.topics[1]; // Attested(requester, tcbId, quote)
  }
  if (!tcbId) throw new Error('could not retrieve attestation id');
  return ethers.utils.arrayify(await lockbox.callStatic.getKey(tcbId));
}

async function mockQuote(registration: Registration): Promise<Uint8Array> {
  const coder = ethers.utils.defaultAbiCoder;
  const measurementHash = '0xc275e487107af5257147ce76e1515788118429e0caa17c04d508038da59d5154'; // static random bytes. this is just a key in a key-value store.
  const regTypeDef =
    'tuple(uint256 currentBlockNumber, bytes32 currentBlockHash, uint256 expiry, uint256 registrant, uint256 tokenExpiry)'; // TODO: keep this in sync with the actual typedef
  const regBytes = coder.encode([regTypeDef], [registration]);
  return ethers.utils.arrayify(
    coder.encode(
      ['bytes32', 'bytes32'],
      [
        measurementHash,
        createKeccakHash('keccak256').update(Buffer.from(regBytes.replace('0x', ''), 'hex')),
      ],
    ),
  );
}

export type Box = {
  keyId: number;
  nonce: string;
  data: string; // hex
};

export async function encrypt(data: BytesLike): Promise<Box> {
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
