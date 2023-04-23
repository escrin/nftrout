import { hkdf, randomBytes } from 'crypto';

import deoxysii from '@oasisprotocol/deoxysii';
import * as sapphire from '@oasisprotocol/sapphire-paratime';
import { ethers } from 'ethers';
import createKeccakHash from 'keccak';

import { AttestationToken, AttestationTokenFactory, Lockbox, LockboxFactory } from '@escrin/evm';

import { decode, encode, memoizeAsync } from './utils';

type Registration = AttestationToken.RegistrationStruct;

export type InitOpts = {
  web3GatewayUrl: string;
  attokAddr: string;
  lockboxAddr: string;
  debug?: Partial<{
    nowrap: boolean;
  }>;
};

export type Box = {
  keyId: number;
  nonce: string;
  data: string; // hex
};

export const LATEST_KEY_ID = 1;

export class ESM {
  public static INIT_SAPPHIRE: InitOpts = {
    web3GatewayUrl: 'https://sapphire.oasis.io',
    attokAddr: '',
    lockboxAddr: '',
  };

  public static INIT_SAPPHIRE_TESTNET: InitOpts = {
    web3GatewayUrl: 'https://testnet.sapphire.oasis.dev',
    attokAddr: '0x960bEAcD9eFfE69e692f727F52Da7DF3601dc80f',
    lockboxAddr: '0x68D4f98E5cd2D8d2C6f03c095761663Bf1aA8442',
  };

  private provider: ethers.providers.Provider;
  private attok: AttestationToken;
  private lockbox: Lockbox;
  private gasWallet: ethers.Wallet;
  private localWallet: ethers.Wallet;

  constructor(public readonly opts: InitOpts, gasKey: string) {
    this.provider = new ethers.providers.JsonRpcProvider(opts.web3GatewayUrl);
    this.gasWallet = new ethers.Wallet(gasKey).connect(this.provider);
    const localWallet = new ethers.Wallet(gasKey).connect(this.provider);
    // const localWallet = ethers.Wallet.createRandom().connect(this.provider);
    this.localWallet = opts.debug?.nowrap ? localWallet : sapphire.wrap(localWallet);
    this.attok = AttestationTokenFactory.connect(opts.attokAddr, this.gasWallet);
    this.lockbox = LockboxFactory.connect(opts.lockboxAddr, this.localWallet);
  }

  private fetchKeySapphire = memoizeAsync(async () => {
    const oneHourFromNow = Math.floor(Date.now() / 1000) + 60 * 60;
    let currentBlock = await this.provider.getBlock('latest');
    const prevBlock = await this.provider.getBlock(currentBlock.number - 1);
    const registration: Registration = {
      baseBlockHash: prevBlock.hash,
      baseBlockNumber: prevBlock.number,
      expiry: oneHourFromNow,
      registrant: this.localWallet.address,
      tokenExpiry: oneHourFromNow,
    };
    const quote = await mockQuote(registration);
    const tcbId = await sendAttestation(this.attok.connect(this.localWallet), quote, registration);
    return getOrCreateKey(this.lockbox, this.gasWallet, tcbId);
  });

  private getCipher = memoizeAsync(async (keyId: number) => {
    let key;
    if (keyId === 0) key = Buffer.alloc(deoxysii.KeySize, 42);
    else if (keyId === 1) key = await this.deriveKey('nftrout/encryption/nfts');
    else throw new Error(`unknown key: ${keyId}`);
    return new deoxysii.AEAD(key);
  });

  public async encrypt(data: Uint8Array, binding?: unknown): Promise<Box> {
    const keyId = LATEST_KEY_ID;
    const cipher = await this.getCipher(keyId);
    const nonce = randomBytes(deoxysii.NonceSize);
    return {
      keyId,
      nonce: encode(nonce),
      data: encode(cipher.encrypt(nonce, data, bind(binding))),
    };
  }

  public async decrypt({ keyId, nonce, data }: Box, binding?: unknown): Promise<Uint8Array> {
    const cipher = await this.getCipher(keyId);
    return cipher.decrypt(decode(nonce), decode(data), bind(binding));
  }

  public async deriveKey(keyId: string, length = 32): Promise<Uint8Array> {
    return new Promise(async (resolve, reject) => {
      const ikm = await this.fetchKeySapphire();
      hkdf('sha512-256', ikm, '', keyId, length, (err, key) => {
        if (err) reject(err);
        else resolve(Buffer.from(key));
      });
    });
  }
}

function bind(prop: unknown): Uint8Array | undefined {
  if (prop === undefined) return undefined;
  return Buffer.from(JSON.stringify(prop));
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
  const expectedTcbId = await attok.callStatic.getTcbId(quote);
  if (await attok.callStatic.isAttested(reg.registrant, expectedTcbId)) return expectedTcbId;
  const tx = await attok.attest(quote, reg, { gasLimit: 10_000_000 });
  const receipt = await tx.wait();
  if (receipt.status !== 1) throw new Error('attestation tx failed');
  let tcbId = '';
  for (const event of receipt.events ?? []) {
    if (event.event !== 'Attested') continue;
    tcbId = event.args!.tcbId;
  }
  if (!tcbId) throw new Error('could not retrieve attestation id');
  await waitForConfirmation(attok.provider, receipt);
  return tcbId;
}

async function waitForConfirmation(
  provider: ethers.providers.Provider,
  receipt: ethers.ContractReceipt,
): Promise<void> {
  if (!('sapphire' in provider)) return;
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
  const receipt = await tx.wait();
  await waitForConfirmation(lockbox.provider, receipt);
  key = await lockbox.callStatic.getKey(tcbId);
  return ethers.utils.arrayify(key);
}
