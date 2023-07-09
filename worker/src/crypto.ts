import { hkdf } from '@noble/hashes/hkdf';
import { sha512_256 } from '@noble/hashes/sha512';
import deoxysii from '@oasislabs/deoxysii';
import canonicalize from 'canonicalize';

const LATEST_KEY_ID = 1;

export class Cipher {
  #rawOmniKey: Uint8Array | undefined;

  constructor(private readonly omniKey: CryptoKey) {}

  public async encrypt(data: Uint8Array, binding?: unknown): Promise<Box> {
    const keyId = LATEST_KEY_ID;
    const cipher = await this.getCipher(keyId);
    const nonce = this.randomBytes(deoxysii.NonceSize);
    return {
      keyId,
      nonce: this.encode(nonce),
      data: this.encode(cipher.encrypt(nonce, data, this.bind(binding))),
    };
  }

  public async decrypt({ keyId, nonce, data }: Box, binding?: unknown): Promise<Uint8Array> {
    const cipher = await this.getCipher(keyId);
    return cipher.decrypt(this.decode(nonce), this.decode(data), this.bind(binding));
  }

  private async getCipher(keyId: number): Promise<deoxysii.AEAD> {
    let key;
    if (keyId === 0) key = Buffer.alloc(deoxysii.KeySize, 42);
    else if (keyId === 1) key = await this.deriveKey('nftrout/encryption/nfts');
    else throw new Error(`unknown key: ${keyId}`);
    return new deoxysii.AEAD(key);
  }

  public async deriveKey(keyId: string, length = 32): Promise<Uint8Array> {
    if (typeof this.#rawOmniKey === 'undefined') {
      this.#rawOmniKey = new Uint8Array(await crypto.subtle.exportKey('raw', this.omniKey));
    }
    return hkdf(sha512_256, this.#rawOmniKey, '', keyId, length);
  }

  private bind(prop: unknown): Uint8Array {
    if (prop === undefined) return new Uint8Array();
    const c = canonicalize(prop);
    if (c === undefined) return new Uint8Array();
    return Buffer.from(c);
  }

  private randomBytes(count: number): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(count));
  }

  private encode = (b: Uint8Array) => Buffer.from(b).toString('base64url');
  private decode = (s: string) => Buffer.from(s, 'base64url');
}

export type Box = {
  keyId: number;
  nonce: string;
  data: string; // hex
};
