import { createHmac, timingSafeEqual } from 'crypto';

export interface CreateHmacSignatureOptions {
  secret: string | Uint8Array;
  payload: string | Uint8Array;
  algorithm?: string;
  digest: 'hex' | 'base64';
  prefix?: string;
}

export interface VerifyHmacSignatureOptions extends CreateHmacSignatureOptions {
  signature: string;
}

export let createHmacSignature = ({
  secret,
  payload,
  algorithm = 'sha256',
  digest,
  prefix = ''
}: CreateHmacSignatureOptions) =>
  `${prefix}${createHmac(algorithm, secret).update(payload).digest(digest)}`;

export let verifyHmacSignature = (options: VerifyHmacSignatureOptions) => {
  let expected = createHmacSignature(options);
  let expectedBytes = Buffer.from(expected);
  let signatureBytes = Buffer.from(options.signature);
  let lengthsMatch = signatureBytes.length === expectedBytes.length;
  let comparableSignature = lengthsMatch ? signatureBytes : Buffer.alloc(expectedBytes.length);

  return timingSafeEqual(comparableSignature, expectedBytes) && lengthsMatch;
};
