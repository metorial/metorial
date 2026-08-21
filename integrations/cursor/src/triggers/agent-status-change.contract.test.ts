import { createHmac } from 'node:crypto';
import { encodeWebhookWireBody } from 'slates';
import { describe, expect, it } from 'vitest';
import { verifyCursorWebhook } from './agent-status-change';

let wireRequest = (body: string, signatures: string[] = []) => ({
  url: 'https://example.com/receivers/cursor',
  method: 'POST' as const,
  headers: signatures.map(value => ['x-webhook-signature', value] as [string, string]),
  body: encodeWebhookWireBody(Buffer.from(body))
});

describe('Cursor agent_status_change verification contract', () => {
  it('accepts the exact raw-body HMAC before dispatch', async () => {
    let body = JSON.stringify({ id: 'agent-1', timestamp: '2026-08-15T00:00:00.000Z' });
    let signature = `sha256=${createHmac('sha256', 'receiver-secret')
      .update(body)
      .digest('hex')}`;
    await expect(
      verifyCursorWebhook({
        input: { originalRequest: wireRequest(body, [signature]) },
        secrets: { cursor_webhook_secret: { value: 'receiver-secret' } }
      })
    ).resolves.toMatchObject({ status: 'accepted' });
  });

  it.each([
    { name: 'missing projection', signatures: ['sha256=invalid'], secret: undefined },
    { name: 'missing signature', signatures: [], secret: 'receiver-secret' },
    { name: 'duplicate signature', signatures: ['one', 'two'], secret: 'receiver-secret' },
    { name: 'mismatch', signatures: ['sha256=invalid'], secret: 'receiver-secret' }
  ])('rejects $name', async ({ signatures, secret }) => {
    let result = await verifyCursorWebhook({
      input: { originalRequest: wireRequest('{}', signatures) },
      secrets: { cursor_webhook_secret: secret ? { value: secret } : undefined }
    });
    expect(result.status).toBe('rejected');
  });
});
