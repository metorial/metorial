import { describe, expect, it } from 'vitest';
import {
  SLATE_WEBHOOK_RESPONSE_MAX_BODY_BYTES,
  serializeWebhookHttpResponse
} from './webhook';

describe('serializeWebhookHttpResponse', () => {
  it('serializes a Response with status, headers, and body', async () => {
    await expect(
      serializeWebhookHttpResponse(
        new Response('created', {
          status: 201,
          headers: {
            'content-type': 'text/plain',
            'x-webhook-result': 'accepted'
          }
        })
      )
    ).resolves.toEqual({
      status: 201,
      headers: {
        'content-type': 'text/plain',
        'x-webhook-result': 'accepted'
      },
      body: {
        encoding: 'base64',
        content: Buffer.from('created').toString('base64')
      }
    });
  });

  it('applies defaults to a plain response init', async () => {
    await expect(serializeWebhookHttpResponse({ body: 'ok' })).resolves.toEqual({
      status: 200,
      headers: {},
      body: {
        encoding: 'base64',
        content: Buffer.from('ok').toString('base64')
      }
    });
  });

  it('serializes binary response bodies without changing their bytes', async () => {
    await expect(
      serializeWebhookHttpResponse({
        status: 202,
        body: new Uint8Array([0, 127, 128, 255])
      })
    ).resolves.toMatchObject({
      status: 202,
      body: {
        encoding: 'base64',
        content: Buffer.from([0, 127, 128, 255]).toString('base64')
      }
    });
  });

  it('rejects bodies larger than one MiB', async () => {
    await expect(
      serializeWebhookHttpResponse({
        body: new Uint8Array(SLATE_WEBHOOK_RESPONSE_MAX_BODY_BYTES + 1)
      })
    ).rejects.toThrow('Webhook response body exceeds');
  });
});
