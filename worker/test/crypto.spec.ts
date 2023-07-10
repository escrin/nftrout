import { hkdf, randomBytes } from 'node:crypto';

import { Cipher } from '../src/crypto';

test.skip('derive key', async () => {
  const ikm = randomBytes(32);
  const keyId = 'testkey';
  const outLength = 32;

  const nodeDerivedKey = await new Promise(async (resolve, reject) => {
    hkdf('sha512-256', ikm, '', keyId, outLength, (err, key) => {
      if (err) reject(err);
      else resolve(Buffer.from(key));
    });
  });

  const cipher = new Cipher(
    await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']),
  );
  // This does not work because `crypto.subtle` does not support SHA512/256.
  const workerDerivedKey = await cipher.deriveKey(keyId, outLength);
  expect(Buffer.from(workerDerivedKey)).toEqual(nodeDerivedKey);
});
