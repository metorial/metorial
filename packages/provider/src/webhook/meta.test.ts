import { describe, expect, it } from 'vitest';
import { getMetaWebhookVerificationResponse, metaWebhookHttp } from './meta';

let verificationRequest = (verifyToken = 'verify-token', challenge = 'challenge-value') =>
  new Request(
    `https://example.com/webhook?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=${challenge}`
  );

describe('Meta webhook verification', () => {
  it('makes only verification GET requests synchronous', () => {
    expect(metaWebhookHttp).toEqual({
      methods: ['GET', 'POST'],
      sync: {
        mode: 'match',
        match: [{ method: 'GET', hasQueryParam: 'hub.mode' }]
      }
    });
  });

  it('returns the challenge for a matching configured token', () => {
    expect(getMetaWebhookVerificationResponse(verificationRequest(), 'verify-token')).toEqual({
      status: 200,
      headers: { 'content-type': 'text/plain' },
      body: 'challenge-value'
    });
  });

  it('rejects a mismatched configured token', () => {
    expect(
      getMetaWebhookVerificationResponse(verificationRequest('wrong-token'), 'verify-token')
    ).toMatchObject({ status: 403 });
    expect(
      getMetaWebhookVerificationResponse(verificationRequest('wrong-token'), '')
    ).toMatchObject({ status: 403 });
  });

  it('preserves legacy verification when no token is configured', () => {
    expect(
      getMetaWebhookVerificationResponse(verificationRequest('legacy-token'), undefined)
    ).toMatchObject({ status: 200, body: 'challenge-value' });
  });

  it('rejects malformed verification and ignores POST events', () => {
    let malformed = new Request('https://example.com/webhook?hub.mode=subscribe');
    let post = new Request('https://example.com/webhook', { method: 'POST' });

    expect(getMetaWebhookVerificationResponse(malformed, undefined)).toMatchObject({
      status: 400
    });
    expect(getMetaWebhookVerificationResponse(post, undefined)).toBeNull();
  });
});
