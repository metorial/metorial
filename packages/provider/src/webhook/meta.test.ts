import { createHash, createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { captureMetaWebhookBootstrap, metaWebhookHttp, verifyMetaWebhook } from './meta';
import { encodeWebhookWireBody, type WebhookWireRequest } from './verification';

let wireRequest = (d: Partial<WebhookWireRequest> = {}): WebhookWireRequest => ({
  url: 'https://example.com/webhook',
  method: 'POST',
  headers: [],
  body: encodeWebhookWireBody(new TextEncoder().encode('{"entry":[]}')),
  ...d
});

let bootstrapRequest = (verifyToken = 'verify-token', challenge = 'challenge-value') =>
  wireRequest({
    url: `https://example.com/webhook?hub.mode=subscribe&hub.verify_token=${verifyToken}&hub.challenge=${challenge}`,
    method: 'GET',
    body: { present: false }
  });

describe('Meta webhook verification', () => {
  it('declares scoped bootstrap and signed delivery rules', () => {
    expect(metaWebhookHttp).toMatchObject({
      registration: { mode: 'manual_bootstrap' },
      methods: ['GET', 'POST'],
      ingress: {
        kind: 'receiver_route',
        baseline: 'receiver_path_secret',
        verification: {
          mechanism: 'provider',
          allowedSecretRefs: [
            { name: 'meta_verify_token', configKey: 'webhookVerifyToken' },
            { name: 'meta_app_secret', configKey: 'webhookAppSecret' }
          ],
          rules: [
            {
              id: 'meta.bootstrap.v1',
              phase: 'bootstrap',
              result: { type: 'sync_only' }
            },
            {
              id: 'meta.delivery.v1',
              phase: 'delivery',
              result: { type: 'dispatch', scope: 'receiver_trigger' },
              replay: { kind: 'enforced' }
            }
          ]
        }
      }
    });
  });

  it('verifies and captures a matching bootstrap request', async () => {
    let originalRequest = bootstrapRequest();
    await expect(
      verifyMetaWebhook({
        input: { ruleId: 'meta.bootstrap.v1', originalRequest },
        secrets: { meta_verify_token: { value: 'verify-token' } }
      })
    ).resolves.toEqual({
      status: 'accepted',
      selection: { scope: 'receiver_trigger' }
    });
    await expect(captureMetaWebhookBootstrap({ input: { originalRequest } })).resolves.toEqual(
      {
        status: 'accepted',
        capturedSecrets: {},
        response: {
          status: 200,
          headers: [['content-type', 'text/plain']],
          body: {
            present: true,
            base64: Buffer.from('challenge-value', 'utf8').toString('base64')
          }
        }
      }
    );
  });

  it('rejects mismatched, missing, and malformed bootstrap credentials', async () => {
    await expect(
      verifyMetaWebhook({
        input: {
          ruleId: 'meta.bootstrap.v1',
          originalRequest: bootstrapRequest('wrong-token')
        },
        secrets: { meta_verify_token: { value: 'verify-token' } }
      })
    ).resolves.toEqual({ status: 'rejected', code: 'credential_invalid' });
    await expect(
      verifyMetaWebhook({
        input: { ruleId: 'meta.bootstrap.v1', originalRequest: bootstrapRequest() },
        secrets: {}
      })
    ).resolves.toEqual({ status: 'rejected', code: 'credential_missing' });
    await expect(
      captureMetaWebhookBootstrap({
        input: { originalRequest: wireRequest({ method: 'GET', body: { present: false } }) }
      })
    ).resolves.toEqual({ status: 'rejected', code: 'wire_input_malformed' });
  });

  it('accepts a valid signed delivery and derives the replay identity', async () => {
    let rawBody = '{"entry":[{"id":"event"}]}';
    let originalRequest = wireRequest({
      headers: [
        [
          'x-hub-signature-256',
          `sha256=${createHmac('sha256', 'app-secret').update(rawBody).digest('hex')}`
        ]
      ],
      body: encodeWebhookWireBody(new TextEncoder().encode(rawBody))
    });
    await expect(
      verifyMetaWebhook({
        input: { ruleId: 'meta.delivery.v1', originalRequest },
        secrets: { meta_app_secret: { value: 'app-secret' } }
      })
    ).resolves.toEqual({
      status: 'accepted',
      selection: { scope: 'receiver_trigger' },
      authenticatedFields: {
        event_id: createHash('sha256').update(rawBody).digest('hex')
      }
    });
  });

  it('rejects unsigned, duplicated, and invalid delivery signatures', async () => {
    let rawBody = '{"entry":[]}';
    let base = wireRequest({ body: encodeWebhookWireBody(new TextEncoder().encode(rawBody)) });
    await expect(
      verifyMetaWebhook({
        input: { ruleId: 'meta.delivery.v1', originalRequest: base },
        secrets: { meta_app_secret: { value: 'app-secret' } }
      })
    ).resolves.toEqual({ status: 'rejected', code: 'credential_missing' });
    await expect(
      verifyMetaWebhook({
        input: {
          ruleId: 'meta.delivery.v1',
          originalRequest: {
            ...base,
            headers: [
              ['x-hub-signature-256', 'sha256=invalid'],
              ['X-Hub-Signature-256', 'sha256=also-invalid']
            ]
          }
        },
        secrets: { meta_app_secret: { value: 'app-secret' } }
      })
    ).resolves.toEqual({ status: 'rejected', code: 'credential_missing' });
    await expect(
      verifyMetaWebhook({
        input: {
          ruleId: 'meta.delivery.v1',
          originalRequest: { ...base, headers: [['x-hub-signature-256', 'sha256=invalid']] }
        },
        secrets: { meta_app_secret: { value: 'app-secret' } }
      })
    ).resolves.toEqual({ status: 'rejected', code: 'credential_invalid' });
  });
});
