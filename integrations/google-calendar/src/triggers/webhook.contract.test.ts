import { encodeWebhookWireBody } from 'slates';
import { beforeEach, describe, expect, it } from 'vitest';
import { getGoogleClientMocks, resetGoogleTriggerClientMocks } from './test-helpers';
import {
  googleCalendarWebhookHttp,
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

describe('Google Calendar immediate channel rotation contract', () => {
  it('declares only the active registration binding', () => {
    expect(googleCalendarWebhookHttp.ingress.verification).toMatchObject({
      rules: [
        {
          when: { registrationStatuses: ['registered'] },
          verify: {
            allowedSecretRefs: [
              'google_channel_id',
              'google_resource_id',
              'google_channel_token'
            ]
          }
        }
      ]
    });
    expect(
      googleCalendarWebhookHttp.ingress.verification.allowedSecretRefs.map(ref => ref.name)
    ).toEqual(['google_channel_id', 'google_resource_id', 'google_channel_token']);
  });

  it('accepts only the exact active channel binding', async () => {
    let secrets = {
      google_channel_id: { value: 'active-channel' },
      google_resource_id: { value: 'active-resource' },
      google_channel_token: { value: 'active-token' }
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

    for (let originalRequest of [
      request('old-channel', 'old-resource', 'old-token'),
      request('active-channel', 'wrong-resource', 'active-token'),
      request('active-channel', 'active-resource', 'wrong-token')
    ]) {
      await expect(
        verifyGoogleCalendarWebhook({ input: { originalRequest }, secrets })
      ).resolves.toMatchObject({ status: 'rejected', code: 'credential_invalid' });
    }
  });

  it('creates a replacement, immediately stops the prior channel, and returns plain secrets', async () => {
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
            calendarId: 'primary'
          }
        }
      },
      'events'
    );

    expect(mocks.stopChannel).toHaveBeenCalledOnce();
    expect(mocks.stopChannel).toHaveBeenCalledWith('active-channel', 'active-resource');
    expect(mocks.watchEvents.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.stopChannel.mock.invocationCallOrder[0]!
    );
    expect(registration).toMatchObject({
      registrationDetails: {
        channelId: 'replacement-channel',
        resourceId: 'replacement-resource',
        channelToken: expect.stringMatching(/^[A-Za-z0-9_-]+$/)
      },
      capturedSecrets: {
        google_channel_id: 'replacement-channel',
        google_resource_id: 'replacement-resource',
        google_channel_token: expect.stringMatching(/^[A-Za-z0-9_-]+$/)
      }
    });
    expect(registration).not.toHaveProperty('state');
    expect(JSON.stringify(registration)).not.toContain('version');
    expect(JSON.stringify(registration)).not.toContain('retiring');
  });

  it('unregisters only the active channel and treats a missing channel as already removed', async () => {
    mocks.stopChannel.mockRejectedValueOnce({ response: { status: 404 } });
    await expect(
      unregisterGoogleCalendarWebhook({
        auth: { token: 'test-token' },
        input: {
          registrationDetails: {
            channelId: 'active-channel',
            resourceId: 'active-resource'
          }
        }
      })
    ).resolves.toBeUndefined();
    expect(mocks.stopChannel).toHaveBeenCalledOnce();
    expect(mocks.stopChannel).toHaveBeenCalledWith('active-channel', 'active-resource');
  });
});
