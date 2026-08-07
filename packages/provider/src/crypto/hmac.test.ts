import { describe, expect, it } from 'vitest';
import { createHmacSignature, verifyHmacSignature } from './hmac';

describe('createHmacSignature', () => {
  it('creates prefixed hexadecimal HMAC signatures', () => {
    expect(
      createHmacSignature({
        secret: 'secret',
        payload: 'payload',
        digest: 'hex',
        prefix: 'v0='
      })
    ).toBe('v0=b82fcb791acec57859b989b430a826488ce2e479fdf92326bd0a2e8375a42ba4');
  });
});

describe('verifyHmacSignature', () => {
  it('verifies prefixed hexadecimal HMAC signatures', () => {
    expect(
      verifyHmacSignature({
        secret: 'secret',
        payload: 'payload',
        signature: 'v0=b82fcb791acec57859b989b430a826488ce2e479fdf92326bd0a2e8375a42ba4',
        digest: 'hex',
        prefix: 'v0='
      })
    ).toBe(true);
  });

  it('rejects incorrect signatures, including signatures of a different length', () => {
    expect(
      verifyHmacSignature({
        secret: 'secret',
        payload: 'payload',
        signature: 'invalid',
        digest: 'base64'
      })
    ).toBe(false);
  });
});
