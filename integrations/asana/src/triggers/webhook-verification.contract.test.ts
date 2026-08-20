import { createHmac } from 'node:crypto';
import { createLocalSlateTestClient, getSlateContract } from '@slates/test';
import { encodeWebhookWireBody } from 'slates';
import { describe, expect, it } from 'vitest';
import { provider } from '../index';
import { captureAsanaWebhookBootstrap, verifyAsanaWebhook } from './task-changes-webhook';

let request = (body: string | null, headers: [string, string][] = []) => ({
  url: 'https://example.com/asana',
  method: 'POST' as const,
  headers,
  body: encodeWebhookWireBody(body === null ? null : Buffer.from(body))
});

describe('Asana generation-bound webhook contract', () => {
  it('allows challenge capture only while registering and signed delivery thereafter', async () => {
    let contract = await getSlateContract(
      createLocalSlateTestClient({
        slate: provider,
        state: {
          config: {},
          auth: { authenticationMethodId: 'oauth', output: { token: 'test-token' } }
        }
      })
    );
    let trigger = contract.triggers.find(action => action.id === 'task_changes_webhook');
    expect(trigger?.invocation).toMatchObject({
      type: 'webhook',
      http: {
        ingress: {
          verification: {
            mechanism: 'provider',
            rules: [
              {
                id: 'asana.bootstrap.v1',
                when: { registrationStatuses: ['registering'] },
                result: { type: 'sync_only' }
              },
              {
                id: 'asana.delivery.v1',
                when: { registrationStatuses: ['registered', 'renewing'] },
                result: { type: 'dispatch' }
              }
            ]
          }
        }
      }
    });
  });

  it('echoes and captures exactly one hook secret at the registration version', async () => {
    let originalRequest = request(null, [['x-hook-secret', 'hook-secret']]);
    await expect(
      verifyAsanaWebhook({
        input: { ruleId: 'asana.bootstrap.v1', originalRequest },
        secrets: {}
      })
    ).resolves.toMatchObject({ status: 'accepted' });
    await expect(
      captureAsanaWebhookBootstrap({
        input: { registrationVersion: 11, originalRequest }
      })
    ).resolves.toMatchObject({
      status: 'accepted',
      capturedSecrets: { asana_hook_secret: { value: 'hook-secret', version: 11 } },
      response: { status: 200, headers: [['X-Hook-Secret', 'hook-secret']] }
    });
  });

  it.each([
    { headers: [] as [string, string][] },
    {
      headers: [
        ['x-hook-secret', 'one'],
        ['x-hook-secret', 'two']
      ] as [string, string][]
    }
  ])('rejects absent or ambiguous bootstrap authority', async ({ headers }) => {
    let result = await verifyAsanaWebhook({
      input: { ruleId: 'asana.bootstrap.v1', originalRequest: request(null, headers) },
      secrets: {}
    });
    expect(result).toMatchObject({ status: 'rejected', code: 'credential_missing' });
  });

  it('requires the captured secret and exact raw-body delivery HMAC', async () => {
    let body = JSON.stringify({ events: [{ resource: { resource_type: 'task', gid: '1' } }] });
    let signature = createHmac('sha256', 'hook-secret').update(body).digest('hex');
    let originalRequest = request(body, [['x-hook-signature', signature]]);
    await expect(
      verifyAsanaWebhook({
        input: { ruleId: 'asana.delivery.v1', originalRequest },
        secrets: { asana_hook_secret: { value: 'hook-secret' } }
      })
    ).resolves.toMatchObject({
      status: 'accepted',
      authenticatedFields: { event_id: expect.stringMatching(/^[a-f0-9]{64}$/) }
    });
    for (let secret of [undefined, 'wrong-secret']) {
      let result = await verifyAsanaWebhook({
        input: { ruleId: 'asana.delivery.v1', originalRequest },
        secrets: { asana_hook_secret: secret ? { value: secret } : undefined }
      });
      expect(result.status).toBe('rejected');
    }
  });

  it('does not accept a post-registration challenge as delivery', async () => {
    let result = await verifyAsanaWebhook({
      input: {
        ruleId: 'asana.delivery.v1',
        originalRequest: request(null, [['x-hook-secret', 'late-secret']])
      },
      secrets: { asana_hook_secret: { value: 'stored-secret' } }
    });
    expect(result).toMatchObject({ status: 'rejected', code: 'credential_missing' });
  });
});
