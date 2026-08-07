import {
  createLocalSlateTestClient,
  getSlateContract,
  handleSlateTriggerWebhook
} from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from '../index';

const TRIGGER_IDS = [
  'project_events',
  'task_events',
  'time_events',
  'timer_events',
  'section_events',
  'client_events',
  'estimate_events'
];

let createTestClient = () =>
  createLocalSlateTestClient({
    slate: provider,
    state: {
      config: {},
      auth: {
        authenticationMethodId: 'api_key',
        output: { token: 'test-token' }
      }
    }
  });

describe('Everhour webhook verification contract', () => {
  it('advertises synchronous X-Hook-Secret handshakes for every webhook', async () => {
    let contract = await getSlateContract(createTestClient());

    for (let triggerId of TRIGGER_IDS) {
      let trigger = contract.triggers.find(action => action.id === triggerId);
      expect(trigger?.invocation).toMatchObject({
        type: 'webhook',
        http: {
          methods: ['POST'],
          sync: {
            mode: 'match',
            match: [{ hasHeader: 'x-hook-secret' }]
          }
        }
      });
    }
  });

  it.each(TRIGGER_IDS)('echoes the handshake secret for %s', async triggerId => {
    let result = await handleSlateTriggerWebhook({
      client: createTestClient(),
      triggerId,
      url: 'https://example.com/webhooks/everhour',
      headers: { 'x-hook-secret': 'everhour-hook-secret' }
    });

    expect(result.inputs).toEqual([]);
    expect(result.response).toMatchObject({
      status: 200,
      headers: { 'x-hook-secret': 'everhour-hook-secret' }
    });
  });

  it('keeps ordinary event deliveries on the asynchronous path', async () => {
    let result = await handleSlateTriggerWebhook({
      client: createTestClient(),
      triggerId: 'task_events',
      url: 'https://example.com/webhooks/everhour',
      body: JSON.stringify({
        event: 'api:task:created',
        payload: { task: { id: 'task-1', name: 'New Task' } }
      })
    });

    expect(result.inputs).toMatchObject([
      { eventType: 'created', task: { id: 'task-1', name: 'New Task' } }
    ]);
    expect(result.response).toBeUndefined();
  });
});
