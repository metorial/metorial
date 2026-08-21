import { createLocalSlateTestClient, getSlateContract } from '@slates/test';
import { encodeWebhookWireBody } from 'slates';
import { describe, expect, it } from 'vitest';
import { provider } from '../index';
import { verifyKofiWebhook } from './payment';

let request = (body: string | null, contentType = 'application/json') => ({
  url: 'https://example.com/ko-fi',
  method: 'POST' as const,
  headers: [['content-type', contentType] as [string, string]],
  body: encodeWebhookWireBody(body === null ? null : Buffer.from(body))
});

describe('Ko-fi payment webhook contract', () => {
  it('projects the verification token from auth output', async () => {
    let contract = await getSlateContract(createLocalSlateTestClient({ slate: provider }));
    let trigger = contract.triggers.find(action => action.id === 'payment_received');
    expect(trigger?.invocation).toMatchObject({
      type: 'webhook',
      http: {
        ingress: {
          verification: {
            allowedSecretRefs: [
              {
                source: 'auth_config',
                name: 'kofi_verification_token',
                credentialKey: 'token'
              }
            ]
          }
        }
      }
    });
  });

  it.each([
    {
      contentType: 'application/json',
      body: JSON.stringify({ verification_token: 'verification-token' })
    },
    {
      contentType: 'application/x-www-form-urlencoded',
      body: new URLSearchParams({
        data: JSON.stringify({ verification_token: 'verification-token' })
      }).toString()
    }
  ])('accepts exact $contentType wire payloads', async ({ contentType, body }) => {
    await expect(
      verifyKofiWebhook({
        input: { originalRequest: request(body, contentType) },
        secrets: { kofi_verification_token: { value: 'verification-token' } }
      })
    ).resolves.toMatchObject({ status: 'accepted' });
  });

  it.each([
    { body: null, secret: 'verification-token', code: 'credential_missing' },
    { body: '{', secret: 'verification-token', code: 'credential_missing' },
    { body: '{}', secret: 'verification-token', code: 'credential_missing' },
    {
      body: JSON.stringify({ verification_token: 'wrong-token' }),
      secret: 'verification-token',
      code: 'credential_invalid'
    },
    {
      body: JSON.stringify({ verification_token: 'verification-token' }),
      secret: undefined,
      code: 'credential_missing'
    }
  ])('rejects malformed, absent, or mismatched tokens', async data => {
    let result = await verifyKofiWebhook({
      input: { originalRequest: request(data.body) },
      secrets: { kofi_verification_token: data.secret ? { value: data.secret } : undefined }
    });
    expect(result).toMatchObject({ status: 'rejected', code: data.code });
  });
});
