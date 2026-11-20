// Notification headers: https://developers.google.com/workspace/calendar/api/guides/push#receive_notifications
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { verifyChannelNotification } from './notification';

let now = Date.parse('2026-11-10T12:00:00Z');
let channel = {
  id: 'channel-1',
  token: 'secret',
  resourceId: 'resource-1',
  expiresAt: new Date(now + 60_000).toISOString()
};
let headers = (changes: Record<string, string> = {}) => ({
  'x-goog-channel-id': channel.id,
  'x-goog-channel-token': channel.token,
  'x-goog-resource-id': channel.resourceId,
  'x-goog-message-number': '9007199254740993123',
  'x-goog-resource-state': 'exists',
  ...changes
});
let verify = (
  init: { method?: string; headers?: Record<string, string>; body?: string } = {},
  emptyBody = true
) =>
  verifyChannelNotification({
    integration: 'google_example',
    channels: [channel],
    emptyBody,
    request: new Request('https://receive.example/hook', {
      method: init.method ?? 'POST',
      headers: init.headers ?? headers(),
      body: init.method === 'GET' ? undefined : (init.body ?? '')
    })
  });

beforeEach(() => vi.spyOn(Date, 'now').mockReturnValue(now));
afterEach(() => vi.restoreAllMocks());

describe('verifyChannelNotification', () => {
  it('accepts an authenticated notification without losing the message number', async () => {
    expect(await verify()).toEqual({
      ok: true,
      channel,
      messageNumber: '9007199254740993123',
      resourceState: 'exists'
    });
  });

  it.each([
    [{ 'x-goog-channel-id': 'other' }, 403, 'channel_mismatch'],
    [{ 'x-goog-channel-token': 'secreT' }, 401, 'token_invalid'],
    [{ 'x-goog-channel-token': '' }, 401, 'token_invalid'],
    [{ 'x-goog-resource-id': 'other' }, 403, 'resource_mismatch'],
    [{ 'x-goog-message-number': '0' }, 400, 'message_invalid'],
    [{ 'x-goog-message-number': '1.5' }, 400, 'message_invalid']
  ])('rejects %o', async (changes, status, what) => {
    expect(await verify({ headers: headers(changes) })).toMatchObject({
      ok: false,
      skip: {
        events: [],
        skipped: { reason: `google_example_webhook_${what}` },
        response: { status }
      }
    });
  });

  it('rejects other methods, an expired channel and an unexpected body', async () => {
    expect(await verify({ method: 'GET' })).toMatchObject({
      skip: {
        skipped: { reason: 'google_example_webhook_method_not_allowed' },
        response: { status: 405, headers: { Allow: 'POST' } }
      }
    });
    expect(await verify({ body: '{"event":"invented"}' })).toMatchObject({
      skip: { skipped: { reason: 'google_example_webhook_body_invalid' } }
    });
    expect(await verify({ body: '{}' }, false)).toMatchObject({ ok: true });
    vi.mocked(Date.now).mockReturnValue(now + 60_000);
    expect(await verify()).toMatchObject({
      skip: {
        skipped: { reason: 'google_example_webhook_channel_expired' },
        response: { status: 403 }
      }
    });
  });
});
