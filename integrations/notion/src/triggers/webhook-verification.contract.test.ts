import { createHmac } from 'node:crypto';
import {
  createLocalSlateTestClient,
  getSlateContract,
  handleSlateTriggerWebhook
} from '@slates/test';
import { encodeWebhookWireBody } from 'slates';
import { describe, expect, it } from 'vitest';
import { provider } from '../index';
import { captureNotionWebhookBootstrap, verifyNotionWebhook } from '../lib/webhook';

let triggerIds = ['page_events', 'comment_events', 'database_events'];
let client = () =>
  createLocalSlateTestClient({
    slate: provider,
    state: {
      config: {},
      auth: { authenticationMethodId: 'oauth', output: { token: 'test-token' } }
    }
  });
let wire = (body: string, signature?: string) => ({
  headers: signature ? ([['x-notion-signature', signature]] as [string, string][]) : [],
  body: encodeWebhookWireBody(Buffer.from(body))
});

describe('Notion generation-bound webhook contract', () => {
  it('limits bootstrap capture to pending/registering and signed delivery to registered', async () => {
    let contract = await getSlateContract(client());
    for (let triggerId of triggerIds) {
      let trigger = contract.triggers.find(action => action.id === triggerId);
      expect(trigger?.invocation).toMatchObject({
        type: 'webhook',
        http: {
          ingress: {
            verification: {
              mechanism: 'provider',
              rules: [
                {
                  id: 'notion.bootstrap.v1',
                  when: { registrationStatuses: ['pending', 'registering'] },
                  result: { type: 'sync_only' }
                },
                {
                  id: 'notion.delivery.v1',
                  when: { registrationStatuses: ['registered'] },
                  result: { type: 'dispatch' }
                }
              ]
            }
          }
        }
      });
    }
  });

  it('captures the bootstrap token as a versionless value', async () => {
    let body = JSON.stringify({ verification_token: 'notion-token' });
    await expect(
      verifyNotionWebhook({
        input: { ruleId: 'notion.bootstrap.v1', originalRequest: wire(body) },
        secrets: {}
      })
    ).resolves.toMatchObject({ status: 'accepted' });
    await expect(
      captureNotionWebhookBootstrap({
        input: { originalRequest: wire(body) }
      })
    ).resolves.toMatchObject({
      status: 'accepted',
      capturedSecrets: {
        notion_verification_token: 'notion-token'
      },
      response: { status: 200 }
    });
  });

  it('rejects malformed bootstrap attempts without a capturable token', async () => {
    for (let body of ['{', '{}', JSON.stringify({ verification_token: '' })]) {
      let result = await verifyNotionWebhook({
        input: { ruleId: 'notion.bootstrap.v1', originalRequest: wire(body) },
        secrets: {}
      });
      expect(result.status).toBe('rejected');
    }
  });

  it('requires the captured token and exact raw-body signature for delivery', async () => {
    let body = JSON.stringify({ id: 'event-1', type: 'page.created', entity: {} });
    let signature = `sha256=${createHmac('sha256', 'notion-token').update(body).digest('hex')}`;
    await expect(
      verifyNotionWebhook({
        input: { ruleId: 'notion.delivery.v1', originalRequest: wire(body, signature) },
        secrets: { notion_verification_token: { value: 'notion-token' } }
      })
    ).resolves.toMatchObject({ status: 'accepted' });
    for (let secrets of [{}, { notion_verification_token: { value: 'wrong-token' } }]) {
      let result = await verifyNotionWebhook({
        input: { ruleId: 'notion.delivery.v1', originalRequest: wire(body, signature) },
        secrets
      });
      expect(result.status).toBe('rejected');
    }
  });

  it('parses a verified page event only after acceptance', async () => {
    let result = await handleSlateTriggerWebhook({
      client: client(),
      triggerId: 'page_events',
      url: 'https://example.com/notion',
      body: JSON.stringify({
        id: 'event-1',
        type: 'page.created',
        timestamp: '2026-08-15T00:00:00.000Z',
        entity: { id: 'page-1', type: 'page' }
      })
    });
    expect(result.inputs).toMatchObject([{ eventType: 'page.created', pageId: 'page-1' }]);
  });
});
