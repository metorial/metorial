import { encodeWebhookWireBody } from 'slates';
import { describe, expect, it } from 'vitest';
import { generateChallengeResponse } from '../lib/webhook';
import { signedBraintreeSample } from '../lib/webhook-test-fixture';
import { captureBraintreeWebhookBootstrap, verifyBraintreeWebhook } from './webhook-events';

let secrets = {
  braintree_environment: { value: 'sandbox' },
  braintree_merchant_id: { value: 'merchant-id' },
  braintree_public_key: { value: 'public-key' },
  braintree_private_key: { value: 'private-key' }
};

let request = (method: 'GET' | 'POST', url: string, body: string | null = null) => ({
  url,
  method,
  headers: [] as [string, string][],
  body: encodeWebhookWireBody(body === null ? null : Buffer.from(body))
});

describe('Braintree webhook_events pre-dispatch contract', () => {
  it('accepts a valid challenge without mutable-state output', async () => {
    let result = await verifyBraintreeWebhook({
      input: {
        originalRequest: request(
          'GET',
          'https://example.com/braintree?bt_challenge=0123456789abcdefabcd'
        )
      },
      secrets
    });
    expect(result).toMatchObject({ status: 'accepted' });
    expect(result).not.toHaveProperty('updatedState');
  });

  it('returns the exact SDK challenge response without capturing or mutating state', async () => {
    let originalRequest = request(
      'GET',
      'https://example.com/braintree?bt_challenge=0123456789abcdefabcd'
    );
    let result = await captureBraintreeWebhookBootstrap({
      input: { originalRequest },
      secrets
    });
    expect(result).toMatchObject({
      status: 'accepted',
      capturedSecrets: {},
      response: { status: 200 }
    });
    if (result.status !== 'accepted') throw new Error('challenge unexpectedly rejected');
    expect(Buffer.from(result.response.body.base64, 'base64').toString()).toBe(
      generateChallengeResponse(
        {
          environment: 'sandbox',
          merchantId: 'merchant-id',
          publicKey: 'public-key',
          privateKey: 'private-key'
        },
        '0123456789abcdefabcd'
      )
    );
    expect(result).not.toHaveProperty('updatedState');
  });

  it('accepts an SDK-generated signed form and emits an authenticated delivery id', async () => {
    let sample = await signedBraintreeSample();
    let body = new URLSearchParams({
      bt_signature: sample.bt_signature,
      bt_payload: sample.bt_payload
    }).toString();
    let result = await verifyBraintreeWebhook({
      input: { originalRequest: request('POST', 'https://example.com/braintree', body) },
      secrets
    });
    expect(result).toMatchObject({
      status: 'accepted',
      authenticatedFields: { delivery_id: expect.stringMatching(/^[a-f0-9]{64}$/) }
    });
  });

  it.each([
    { body: null, code: 'wire_input_malformed' },
    { body: '', code: 'wire_input_malformed' },
    { body: 'bt_signature=missing-payload', code: 'wire_input_malformed' },
    {
      body: 'bt_signature=public-key%7Cdeadbeef&bt_payload=not-base64',
      code: 'wire_input_malformed'
    }
  ])('rejects malformed POST wire input', async ({ body, code }) => {
    let result = await verifyBraintreeWebhook({
      input: { originalRequest: request('POST', 'https://example.com/braintree', body) },
      secrets
    });
    expect(result).toMatchObject({ status: 'rejected', code });
  });

  it('fails closed when any projected credential is missing', async () => {
    let result = await verifyBraintreeWebhook({
      input: { originalRequest: request('POST', 'https://example.com/braintree', '') },
      secrets: { ...secrets, braintree_private_key: undefined }
    });
    expect(result).toMatchObject({ status: 'rejected', code: 'credential_missing' });
  });
});
