import { encodeWebhookWireBody } from 'slates';
import { beforeEach, describe, expect, it } from 'vitest';
import { getGoogleClientMocks, resetGoogleTriggerClientMocks } from './test-helpers';
import {
  registerGoogleCalendarWebhook,
  unregisterGoogleCalendarWebhook,
  verifyGoogleCalendarWebhook
} from './webhook';

let mocks = getGoogleClientMocks();
let request = (channelId: string, resourceId: string, token: string, message = '1') => ({
  url: 'https://example.com/google',
  method: 'POST' as const,
  headers: [
    ['x-goog-channel-id', channelId],
    ['x-goog-resource-id', resourceId],
    ['x-goog-channel-token', token],
    ['x-goog-message-number', message]
  ] as [string, string][],
  body: encodeWebhookWireBody(Buffer.alloc(0))
});

beforeEach(resetGoogleTriggerClientMocks);

describe('Google Calendar channel renewal contract', () => {
  it('accepts only the exact active or bounded retiring channel binding', async () => {
    let secrets = {
      google_channel_id: { value: 'active-channel' },
      google_resource_id: { value: 'active-resource' },
      google_channel_token: { value: 'active-token' },
      google_retiring_channel_id: { value: 'retiring-channel' },
      google_retiring_resource_id: { value: 'retiring-resource' },
      google_retiring_channel_token: { value: 'retiring-token' },
      google_retiring_valid_until: { value: String(Date.now() + 60_000) }
    };
    await expect(
      verifyGoogleCalendarWebhook({
        input: {
          originalRequest: request('active-channel', 'active-resource', 'active-token', '10')
        },
        secrets
      })
    ).resolves.toMatchObject({
      status: 'accepted',
      authenticatedFields: { event_id: 'active-channel:10' }
    });
    await expect(
      verifyGoogleCalendarWebhook({
        input: {
          originalRequest: request(
            'retiring-channel',
            'retiring-resource',
            'retiring-token',
            '11'
          )
        },
        secrets
      })
    ).resolves.toMatchObject({ status: 'accepted' });
    for (let originalRequest of [
      request('active-channel', 'wrong-resource', 'active-token'),
      request('active-channel', 'active-resource', 'wrong-token')
    ]) {
      await expect(
        verifyGoogleCalendarWebhook({ input: { originalRequest }, secrets })
      ).resolves.toMatchObject({ status: 'rejected', code: 'credential_invalid' });
    }
  });

  it('rejects an expired retiring binding', async () => {
    let result = await verifyGoogleCalendarWebhook({
      input: {
        originalRequest: request('retiring-channel', 'retiring-resource', 'retiring-token')
      },
      secrets: {
        google_channel_id: { value: 'active-channel' },
        google_resource_id: { value: 'active-resource' },
        google_channel_token: { value: 'active-token' },
        google_retiring_channel_id: { value: 'retiring-channel' },
        google_retiring_resource_id: { value: 'retiring-resource' },
        google_retiring_channel_token: { value: 'retiring-token' },
        google_retiring_valid_until: { value: String(Date.now() - 1) }
      }
    });
    expect(result).toMatchObject({ status: 'rejected', code: 'credential_invalid' });
  });

  it('creates the replacement first, retires the prior active channel, and stops older overlap', async () => {
    mocks.watchEvents.mockResolvedValueOnce({
      id: 'replacement-channel',
      resourceId: 'replacement-resource',
      expiration: '2000000000000'
    });
    let registration = await registerGoogleCalendarWebhook(
      {
        auth: { token: 'test-token' },
        input: {
          webhookBaseUrl: 'https://example.com/google',
          registrationDetails: {
            channelId: 'active-channel',
            resourceId: 'active-resource',
            channelToken: 'active-token',
            expiration: '1900000000000',
            calendarId: 'primary',
            retiringChannelId: 'older-channel',
            retiringResourceId: 'older-resource',
            retiringChannelToken: 'older-token',
            retiringValidUntil: String(Date.now() - 1)
          },
          capturedSecretVersions: {
            google_channel_id: 2,
            google_resource_id: 2,
            google_channel_token: 2,
            google_retiring_channel_id: 2,
            google_retiring_resource_id: 2,
            google_retiring_channel_token: 2,
            google_retiring_valid_until: 2
          }
        }
      },
      'events'
    );
    expect(mocks.stopChannel).toHaveBeenCalledWith('older-channel', 'older-resource');
    expect(registration).toMatchObject({
      registrationDetails: {
        channelId: 'replacement-channel',
        resourceId: 'replacement-resource',
        channelToken: expect.stringMatching(/^[A-Za-z0-9_-]+$/),
        retiringChannelId: 'active-channel',
        retiringResourceId: 'active-resource',
        retiringChannelToken: 'active-token'
      }
    });
    expect(registration).not.toHaveProperty('state');
    expect(Object.keys(registration.capturedSecrets)).toHaveLength(7);
  });

  it('stops every unique active and retiring channel on final cleanup', async () => {
    await unregisterGoogleCalendarWebhook({
      auth: { token: 'test-token' },
      input: {
        registrationDetails: {
          channelId: 'active-channel',
          resourceId: 'active-resource',
          retiringChannelId: 'retiring-channel',
          retiringResourceId: 'retiring-resource'
        }
      }
    });
    expect(mocks.stopChannel).toHaveBeenCalledTimes(2);
    expect(mocks.stopChannel).toHaveBeenCalledWith('active-channel', 'active-resource');
    expect(mocks.stopChannel).toHaveBeenCalledWith('retiring-channel', 'retiring-resource');
  });

  it('treats an already-removed retiring channel as an idempotent cleanup retry', async () => {
    mocks.stopChannel.mockRejectedValueOnce({ response: { status: 404 } });
    await expect(
      unregisterGoogleCalendarWebhook({
        auth: { token: 'test-token' },
        input: {
          registrationDetails: {
            channelId: 'retiring-channel',
            resourceId: 'retiring-resource'
          }
        }
      })
    ).resolves.toBeUndefined();
  });
});
