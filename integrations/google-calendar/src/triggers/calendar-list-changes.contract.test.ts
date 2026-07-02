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

describe('google-calendar calendar_list_changes trigger', () => {
  it('registers and unregisters the webhook', async () => {
    let client = createGoogleTriggerTestClient();

    googleClientMocks.listCalendarList.mockResolvedValueOnce({
      items: [],
      nextSyncToken: 'calendar-sync-1'
    });
    googleClientMocks.watchCalendarList.mockResolvedValueOnce({
      id: 'calendar-channel-1',
      resourceId: 'calendar-resource-1',
      expiration: '1700000000001'
    });

    let registration = await registerSlateTriggerWebhook({
      client,
      triggerId: 'calendar_list_changes',
      webhookBaseUrl: 'https://example.com/hooks/calendar-list'
    });

    expect(googleClientMocks.listCalendarList).toHaveBeenCalledWith({ maxResults: 1 });
    expect(googleClientMocks.watchCalendarList).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'web_hook',
        address: 'https://example.com/hooks/calendar-list'
      })
    );
    expect(registration).toMatchObject({
      registrationDetails: {
        channelId: 'calendar-channel-1',
        resourceId: 'calendar-resource-1',
        expiration: '1700000000001',
        syncToken: 'calendar-sync-1'
      }
    });

    await unregisterSlateTriggerWebhook({
      client,
      triggerId: 'calendar_list_changes',
      webhookBaseUrl: 'https://example.com/hooks/calendar-list',
      registrationDetails: registration.registrationDetails
    });
    expect(googleClientMocks.stopChannel).toHaveBeenCalledWith(
      'calendar-channel-1',
      'calendar-resource-1'
    );
  });

  it('handles sync, incremental updates, and event mapping', async () => {
    let client = createGoogleTriggerTestClient();

    let ignored = await handleSlateTriggerWebhook({
      client,
      triggerId: 'calendar_list_changes',
      url: 'https://example.com/hooks/calendar-list',
      headers: {
        'x-goog-resource-state': 'sync'
      }
    });
    expect(ignored.inputs).toEqual([]);

    googleClientMocks.listCalendarList.mockResolvedValueOnce({
      items: [
        {
          id: 'calendar-added',
          summary: 'Shared calendar',
          accessRole: 'reader',
          primary: false
        },
        {
          id: 'calendar-removed',
          summary: 'Removed calendar',
          deleted: true
        }
      ],
      nextSyncToken: 'calendar-sync-2'
    });

    let handled = await handleSlateTriggerWebhook({
      client,
      triggerId: 'calendar_list_changes',
      url: 'https://example.com/hooks/calendar-list',
      headers: {
        'x-goog-resource-state': 'exists'
      },
      state: {
        syncToken: 'calendar-sync-1'
      }
    });

    expect(googleClientMocks.listCalendarList).toHaveBeenCalledWith({
      syncToken: 'calendar-sync-1',
      showDeleted: true,
      showHidden: true
    });
    expect(
      handled.inputs.map((input: Record<string, any>) => input.changeType as string)
    ).toEqual(['updated', 'removed']);
    expect(handled.updatedState).toMatchObject({
      syncToken: 'calendar-sync-2'
    });

    let mapped = await mapSlateTriggerEvent({
      client,
      triggerId: 'calendar_list_changes',
      input: handled.inputs[1]!,
      type: 'calendar_list.removed',
      output: {
        calendarId: 'calendar-removed',
        summary: 'Removed calendar'
      }
    });
    expect(mapped.id).toContain('calendar-removed-');
  });

  it('re-seeds state on 410 responses', async () => {
    let client = createGoogleTriggerTestClient();

    googleClientMocks.listCalendarList
      .mockRejectedValueOnce({
        response: { status: 410 }
      })
      .mockResolvedValueOnce({
        items: [],
        nextSyncToken: 'calendar-sync-reset'
      });

    let handled = await handleSlateTriggerWebhook({
      client,
      triggerId: 'calendar_list_changes',
      url: 'https://example.com/hooks/calendar-list',
      headers: {
        'x-goog-resource-state': 'exists'
      },
      state: {
        syncToken: 'expired-calendar-token'
      }
    });

    expect(handled.inputs).toEqual([]);
    expect(handled.updatedState).toMatchObject({
      syncToken: 'calendar-sync-reset'
    });
    expect(googleClientMocks.listCalendarList).toHaveBeenNthCalledWith(2, {
      maxResults: 1
    });
  });
});
