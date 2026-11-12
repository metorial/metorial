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

/** Constant-time secret comparison; an empty expected secret matches nothing. */
export let timingSafeStringEqual = (expected: string, received: string | null | undefined) => {
  let expectedBytes = Buffer.from(expected);
  let receivedBytes = Buffer.from(received ?? '');
  let lengthsMatch = receivedBytes.length === expectedBytes.length;
  let comparable = lengthsMatch ? receivedBytes : Buffer.alloc(expectedBytes.length);

  return (
    timingSafeEqual(comparable, expectedBytes) && lengthsMatch && expectedBytes.length > 0
  );
};

export let verifyHmacSignature = (options: VerifyHmacSignatureOptions) =>
  timingSafeStringEqual(createHmacSignature(options), options.signature);
