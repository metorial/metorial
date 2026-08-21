import { encodeWebhookWireBody } from '@slates/provider';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let verifyWebhookSignature = vi.hoisted(() => vi.fn());

vi.mock('./client', () => ({
  PayPalClient: class {
    verifyWebhookSignature = verifyWebhookSignature;
  }
}));

import { verifyPayPalWebhook } from './webhook';

let headers = (overrides: Record<string, string | null> = {}) => {
  let values: Record<string, string | null> = {
    'paypal-auth-algo': 'SHA256withRSA',
    'paypal-cert-url': 'https://api.paypal.com/cert.pem',
    'paypal-transmission-id': 'transmission-1',
    'paypal-transmission-sig': 'signature',
    'paypal-transmission-time': '2026-08-15T00:00:00.000Z',
    ...overrides
  };
  return Object.entries(values).flatMap(([name, value]) =>
    value === null ? [] : ([[name, value]] as [string, string][])
  );
};

let request = (requestHeaders = headers(), body = JSON.stringify({ id: 'event-1' })) => ({
  url: 'https://example.com/paypal',
  method: 'POST' as const,
  headers: requestHeaders,
  body: encodeWebhookWireBody(Buffer.from(body))
});

let secrets = (webhookId = 'webhook-1') => ({
  paypal_webhook_id: { value: webhookId },
  paypal_access_token: { value: 'token' },
  paypal_client_id: { value: 'client-id' },
  paypal_client_secret: { value: 'client-secret' },
  paypal_environment: { value: 'sandbox' }
});

beforeEach(() => {
  verifyWebhookSignature.mockReset();
});

describe('PayPal webhook pre-dispatch contract', () => {
  it('authorizes only SUCCESS and binds authenticated replay fields', async () => {
    verifyWebhookSignature.mockResolvedValue({ verificationStatus: 'SUCCESS' });
    let result = await verifyPayPalWebhook({
      input: { originalRequest: request() },
      secrets: secrets()
    });
    expect(verifyWebhookSignature).toHaveBeenCalledWith(
      expect.objectContaining({
        transmissionId: 'transmission-1',
        transmissionTime: '2026-08-15T00:00:00.000Z',
        webhookId: 'webhook-1',
        webhookEvent: { id: 'event-1' }
      })
    );
    expect(result).toMatchObject({
      status: 'accepted',
      authenticatedFields: {
        timestamp: '2026-08-15T00:00:00.000Z',
        event_id: 'event-1',
        delivery_id: expect.stringMatching(/^[a-f0-9]{64}$/)
      }
    });
  });

  it.each([
    'paypal-auth-algo',
    'paypal-cert-url',
    'paypal-transmission-id',
    'paypal-transmission-sig',
    'paypal-transmission-time'
  ])('rejects a missing %s header before the PayPal call', async name => {
    let result = await verifyPayPalWebhook({
      input: { originalRequest: request(headers({ [name]: null })) },
      secrets: secrets()
    });
    expect(result).toMatchObject({ status: 'rejected', code: 'credential_missing' });
    expect(verifyWebhookSignature).not.toHaveBeenCalled();
  });

  it('rejects a missing registration webhook binding', async () => {
    let result = await verifyPayPalWebhook({
      input: { originalRequest: request() },
      secrets: { ...secrets(), paypal_webhook_id: undefined }
    });
    expect(result).toMatchObject({ status: 'rejected', code: 'credential_missing' });
  });

  it('rejects non-SUCCESS verification and provider failures', async () => {
    verifyWebhookSignature.mockResolvedValueOnce({ verificationStatus: 'FAILURE' });
    await expect(
      verifyPayPalWebhook({ input: { originalRequest: request() }, secrets: secrets('wrong') })
    ).resolves.toMatchObject({ status: 'rejected', code: 'credential_invalid' });
    verifyWebhookSignature.mockRejectedValueOnce(new Error('PayPal unavailable'));
    await expect(
      verifyPayPalWebhook({ input: { originalRequest: request() }, secrets: secrets() })
    ).resolves.toMatchObject({ status: 'rejected', code: 'provider_error' });
  });

  it('rejects duplicate required headers and malformed event JSON', async () => {
    let duplicated = [
      ...headers(),
      ['paypal-transmission-id', 'transmission-2'] as [string, string]
    ];
    await expect(
      verifyPayPalWebhook({
        input: { originalRequest: request(duplicated) },
        secrets: secrets()
      })
    ).resolves.toMatchObject({ status: 'rejected', code: 'credential_missing' });
    await expect(
      verifyPayPalWebhook({
        input: { originalRequest: request(headers(), '{') },
        secrets: secrets()
      })
    ).resolves.toMatchObject({ status: 'rejected', code: 'wire_input_malformed' });
  });
});
