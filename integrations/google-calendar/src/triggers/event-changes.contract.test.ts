import {
  handleSlateTriggerWebhook,
  mapSlateTriggerEvent,
  registerSlateTriggerWebhook,
  unregisterSlateTriggerWebhook
} from '@slates/test';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  createGoogleTriggerTestClient,
  getGoogleClientMocks,
  resetGoogleTriggerClientMocks
} from './test-helpers';

let googleClientMocks = getGoogleClientMocks();

beforeEach(() => {
  resetGoogleTriggerClientMocks();
});

describe('google-calendar event_changes trigger', () => {
  it('registers and unregisters the webhook', async () => {
    let client = createGoogleTriggerTestClient();

    googleClientMocks.listEvents.mockResolvedValueOnce({
      items: [],
      nextSyncToken: 'event-sync-1'
    });
    googleClientMocks.watchEvents.mockResolvedValueOnce({
      id: 'event-channel-1',
      resourceId: 'resource-1',
      expiration: '1700000000000'
    });

    let registration = await registerSlateTriggerWebhook({
      client,
      triggerId: 'event_changes',
      webhookBaseUrl: 'https://example.com/hooks/events'
    });

    expect(googleClientMocks.tokens).toContain('test-token');
    expect(googleClientMocks.listEvents).toHaveBeenCalledWith({
      calendarId: 'primary',
      maxResults: 1,
      showDeleted: true
    });
    expect(googleClientMocks.watchEvents).toHaveBeenCalledWith(
      'primary',
      expect.objectContaining({
        type: 'web_hook',
        address: 'https://example.com/hooks/events'
      })
    );
    expect(registration).toMatchObject({
      registrationDetails: {
        channelId: 'event-channel-1',
        resourceId: 'resource-1',
        calendarId: 'primary',
        expiration: '1700000000000',
        syncToken: 'event-sync-1'
      }
    });

    await unregisterSlateTriggerWebhook({
      client,
      triggerId: 'event_changes',
      webhookBaseUrl: 'https://example.com/hooks/events',
      registrationDetails: registration.registrationDetails
    });
    expect(googleClientMocks.stopChannel).toHaveBeenCalledWith(
      'event-channel-1',
      'resource-1'
    );
  });

  it('handles sync, incremental updates, and event mapping', async () => {
    let client = createGoogleTriggerTestClient();

    let syncResult = await handleSlateTriggerWebhook({
      client,
      triggerId: 'event_changes',
      url: 'https://example.com/hooks/events',
      headers: {
        'x-goog-resource-state': 'sync'
      }
    });
    expect(syncResult.inputs).toEqual([]);

    googleClientMocks.listEvents.mockResolvedValueOnce({
      items: [
        {
          id: 'event-created',
          summary: 'Created event',
          status: 'confirmed',
          created: '2026-04-01T10:00:00.000Z',
          updated: '2026-04-01T10:00:00.000Z'
        },
        {
          id: 'event-updated',
          summary: 'Updated event',
          status: 'confirmed',
          created: '2026-04-01T09:00:00.000Z',
          updated: '2026-04-01T10:00:00.000Z'
        },
        {
          id: 'event-deleted',
          summary: 'Deleted event',
          status: 'cancelled',
          updated: '2026-04-01T11:00:00.000Z'
        }
      ],
      nextSyncToken: 'event-sync-2'
    });

    let handled = await handleSlateTriggerWebhook({
      client,
      triggerId: 'event_changes',
      url: 'https://example.com/hooks/events',
      headers: {
        'x-goog-channel-id': 'event-channel-2',
        'x-goog-resource-state': 'exists'
      },
      state: {
        calendarId: 'team-calendar',
        syncToken: 'event-sync-1'
      }
    });

    expect(googleClientMocks.listEvents).toHaveBeenCalledWith({
      calendarId: 'team-calendar',
      showDeleted: true,
      singleEvents: false,
      syncToken: 'event-sync-1'
    });
    expect(handled.updatedState).toMatchObject({
      syncToken: 'event-sync-2',
      calendarId: 'team-calendar',
      channelId: 'event-channel-2'
    });
    expect(
      handled.inputs.map((input: Record<string, any>) => input.changeType as string)
    ).toEqual(['created', 'updated', 'deleted']);

    let mapped = await mapSlateTriggerEvent({
      client,
      triggerId: 'event_changes',
      input: handled.inputs[0]!,
      type: 'event.created',
      output: {
        eventId: 'event-created',
        calendarId: 'team-calendar',
        summary: 'Created event'
      }
    });
    expect(mapped.id).toBe('event-created-2026-04-01T10:00:00.000Z');
  });

  it('re-seeds state when Google invalidates the sync token', async () => {
    let client = createGoogleTriggerTestClient();

    googleClientMocks.listEvents
      .mockRejectedValueOnce({
        response: { status: 410 }
      })
      .mockResolvedValueOnce({
        items: [],
        nextSyncToken: 'event-sync-reset'
      });

    let handled = await handleSlateTriggerWebhook({
      client,
      triggerId: 'event_changes',
      url: 'https://example.com/hooks/events',
      headers: {
        'x-goog-channel-id': 'event-channel-3',
        'x-goog-resource-state': 'exists'
      },
      state: {
        calendarId: 'team-calendar',
        syncToken: 'expired-token'
      }
    });

    expect(handled.inputs).toEqual([]);
    expect(handled.updatedState).toMatchObject({
      syncToken: 'event-sync-reset',
      calendarId: 'team-calendar',
      channelId: 'event-channel-3'
    });
    expect(googleClientMocks.listEvents).toHaveBeenNthCalledWith(2, {
      calendarId: 'team-calendar',
      maxResults: 1,
      showDeleted: true
    });
  });
});
