import { createHmac } from 'node:crypto';
import { encodeWebhookWireBody } from '@slates/provider';
import { createLocalSlateTestClient, getSlateContract } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from '../index';
import { verifyQuickBooksWebhook } from './entity-webhook';

let request = (body: string, signatures: string[] = []) => ({
  url: 'https://example.com/quickbooks',
  method: 'POST' as const,
  headers: signatures.map(value => ['intuit-signature', value] as [string, string]),
  body: encodeWebhookWireBody(Buffer.from(body))
});

describe('QuickBooks entity webhook contract', () => {
  it('projects the verifier token from auth instead of configuration', async () => {
    let contract = await getSlateContract(
      createLocalSlateTestClient({ slate: provider, state: { config: {} } })
    );
    expect(JSON.stringify(contract.configSchema)).not.toContain('webhookVerifierToken');
    let trigger = contract.triggers.find(action => action.id === 'entity_change_webhook');
    expect(trigger?.invocation).toMatchObject({
      type: 'webhook',
      http: {
        ingress: {
          verification: {
            allowedSecretRefs: [
              {
                source: 'auth_config',
                name: 'quickbooks_webhook_verifier_token',
                credentialKey: 'webhookVerifierToken'
              }
            ]
          }
        }
      }
    });
  });

  it('accepts an exact raw-body Intuit HMAC', async () => {
    let body = JSON.stringify({ eventNotifications: [] });
    let signature = createHmac('sha256', 'verifier-token').update(body).digest('base64');
    await expect(
      verifyQuickBooksWebhook({
        input: { originalRequest: request(body, [signature]) },
        secrets: { quickbooks_webhook_verifier_token: { value: 'verifier-token' } }
      })
    ).resolves.toMatchObject({ status: 'accepted' });
  });

  it.each([
    { token: undefined, signatures: ['invalid'], expected: 'credential_missing' },
    { token: 'verifier-token', signatures: [], expected: 'credential_missing' },
    { token: 'verifier-token', signatures: ['one', 'two'], expected: 'credential_missing' },
    { token: 'verifier-token', signatures: ['invalid'], expected: 'credential_invalid' }
  ])('rejects missing, malformed, or mismatched authority', async data => {
    let result = await verifyQuickBooksWebhook({
      input: { originalRequest: request('{}', data.signatures) },
      secrets: {
        quickbooks_webhook_verifier_token: data.token ? { value: data.token } : undefined
      }
    });
    expect(result).toMatchObject({ status: 'rejected', code: data.expected });
  });
});
