import {
  createLocalSlateTestClient,
  getSlateContract,
  handleSlateTriggerWebhook
} from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from '../index';

let createAzureTriggerTestClient = () =>
  createLocalSlateTestClient({
    slate: provider,
    state: {
      config: { storageAccountName: 'teststorage' },
      auth: {
        authenticationMethodId: 'sas_token',
        output: { token: 'sv=test' }
      }
    }
  });

let decodeBody = (response: { body?: { content: string } | null }) =>
  Buffer.from(response.body?.content ?? '', 'base64').toString();

describe('Azure Blob Storage Event Grid webhook contract', () => {
  it('advertises narrow Event Grid and CloudEvents validation matchers', async () => {
    let contract = await getSlateContract(createAzureTriggerTestClient());
    let trigger = contract.triggers.find(action => action.id === 'blob_events');

    expect(trigger?.invocation).toMatchObject({
      type: 'webhook',
      http: {
        methods: ['POST', 'OPTIONS'],
        sync: {
          mode: 'match',
          match: [
            { method: 'OPTIONS' },
            {
              method: 'POST',
              jsonBodyField: {
                path: '0.eventType',
                equals: 'Microsoft.EventGrid.SubscriptionValidationEvent'
              }
            }
          ]
        }
      }
    });
  });

  it('returns the Event Grid validation code synchronously', async () => {
    let result = await handleSlateTriggerWebhook({
      client: createAzureTriggerTestClient(),
      triggerId: 'blob_events',
      url: 'https://example.com/callbacks/azure/blob-events',
      body: JSON.stringify([
        {
          eventType: 'Microsoft.EventGrid.SubscriptionValidationEvent',
          data: { validationCode: 'validation-code' }
        }
      ])
    });

    expect(result.inputs).toEqual([]);
    expect(result.response).toMatchObject({
      status: 200,
      headers: { 'content-type': 'application/json' }
    });
    expect(JSON.parse(decodeBody(result.response!))).toEqual({
      validationResponse: 'validation-code'
    });
  });

  it('grants a CloudEvents origin without trying to parse an OPTIONS body', async () => {
    let result = await handleSlateTriggerWebhook({
      client: createAzureTriggerTestClient(),
      triggerId: 'blob_events',
      method: 'OPTIONS',
      url: 'https://example.com/callbacks/azure/blob-events',
      headers: { 'webhook-request-origin': 'eventgrid.azure.net' }
    });

    expect(result.inputs).toEqual([]);
    expect(result.response).toMatchObject({
      status: 200,
      headers: {
        allow: 'POST',
        'webhook-allowed-origin': 'eventgrid.azure.net',
        'webhook-allowed-rate': '*'
      },
      body: null
    });
  });

  it('rejects a CloudEvents OPTIONS handshake without an origin header', async () => {
    let result = await handleSlateTriggerWebhook({
      client: createAzureTriggerTestClient(),
      triggerId: 'blob_events',
      method: 'OPTIONS',
      url: 'https://example.com/callbacks/azure/blob-events'
    });

    expect(result.inputs).toEqual([]);
    expect(result.response).toMatchObject({
      status: 405,
      headers: { allow: 'POST' }
    });
  });

  it('keeps ordinary blob event notifications on the asynchronous path', async () => {
    let result = await handleSlateTriggerWebhook({
      client: createAzureTriggerTestClient(),
      triggerId: 'blob_events',
      url: 'https://example.com/callbacks/azure/blob-events',
      body: JSON.stringify([
        {
          eventType: 'Microsoft.Storage.BlobCreated',
          id: 'event-1',
          eventTime: '2026-08-06T00:00:00.000Z',
          subject: '/blobServices/default/containers/photos/blobs/image.png',
          topic:
            '/subscriptions/sub/resourceGroups/rg/providers/Microsoft.Storage/storageAccounts/teststorage',
          data: {
            api: 'PutBlob',
            url: 'https://teststorage.blob.core.windows.net/photos/image.png',
            contentType: 'image/png',
            contentLength: 1024,
            blobType: 'BlockBlob',
            sequencer: '0000000000000000001'
          }
        }
      ])
    });

    expect(result.inputs).toHaveLength(1);
    expect(result.inputs[0]).toMatchObject({ eventType: 'Microsoft.Storage.BlobCreated' });
    expect(result.response).toBeUndefined();
  });

  it('ignores malformed JSON bodies without failing', async () => {
    let result = await handleSlateTriggerWebhook({
      client: createAzureTriggerTestClient(),
      triggerId: 'blob_events',
      url: 'https://example.com/callbacks/azure/blob-events',
      body: 'not-json'
    });

    expect(result.inputs).toEqual([]);
    expect(result.response).toBeUndefined();
  });
});
