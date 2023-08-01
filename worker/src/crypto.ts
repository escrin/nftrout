import deoxysii from '@oasisprotocol/deoxysii';
import canonicalize from 'canonicalize';

const LATEST_KEY_ID = 1;

export class Cipher {
  public static async testing(): Promise<Cipher> {
    return new Cipher(
      await crypto.subtle.importKey(
        'raw',
        new Uint8Array(32),
        { name: 'HKDF', hash: 'SHA-512-256' },
        false,
        ['deriveKey', 'deriveBits'],
      ),
    );
  }

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
    if (keyId === 0) key = new Uint8Array(deoxysii.KeySize).fill(42);
    else if (keyId === 1) key = await this.deriveKey('nftrout/encryption/nfts');
    else throw new Error(`unknown key: ${keyId}`);
    return new deoxysii.AEAD(key);
  }

  public async deriveKey(keyId: string, length = 32): Promise<Uint8Array> {
    return new Uint8Array(
      await crypto.subtle.deriveBits(
        {
          name: 'HKDF',
          hash: 'SHA-512-256',
          salt: new Uint8Array(),
          info: new TextEncoder().encode(keyId),
        },
        this.omniKey,
        length << 3, // bits
      ),
    );
  }

  private bind(prop: unknown): Uint8Array {
    if (prop === undefined) return new Uint8Array();
    const c = canonicalize(prop);
    if (c === undefined) return new Uint8Array();
    return new TextEncoder().encode(c);
  }

  private randomBytes(count: number): Uint8Array {
    return crypto.getRandomValues(new Uint8Array(count));
  }

  private encode(b: Uint8Array): string {
    let binaryStr = '';
    for (let i = 0; i < b.byteLength; i++) {
      binaryStr += String.fromCharCode(b[i]);
    }
    let base64 = btoa(binaryStr);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  private decode(s: string): Uint8Array {
    // Padding might be needed if input isn't a multiple of 4
    let padding = '='.repeat((4 - (s.length % 4)) % 4);
    // Replace url-safe characters back to original base64 characters.
    let base64 = (s + padding).replace(/-/g, '+').replace(/_/g, '/');

    let binaryStr = atob(base64);
    let len = binaryStr.length;
    let bytes = new Uint8Array(binaryStr.length);

    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    return bytes;
  }
}

export type Box = {
  keyId: number;
  nonce: string;
  data: string; // hex
};
