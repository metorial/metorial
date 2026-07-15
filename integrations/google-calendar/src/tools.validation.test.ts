import { createLocalSlateTestClient, expectSlateError } from '@slates/test';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let calendarClientMocks = vi.hoisted(() => ({
  createEvent: vi.fn(),
  deleteEvent: vi.fn(),
  getEvent: vi.fn(),
  getSetting: vi.fn(),
  listSettings: vi.fn(),
  updateCalendarListEntry: vi.fn(),
  updateEvent: vi.fn()
}));

vi.mock('./lib/client', () => ({
  GoogleCalendarClient: class {
    createEvent(...args: unknown[]) {
      return calendarClientMocks.createEvent(...args);
    }

    deleteEvent(...args: unknown[]) {
      return calendarClientMocks.deleteEvent(...args);
    }

    getEvent(...args: unknown[]) {
      return calendarClientMocks.getEvent(...args);
    }

    getSetting(...args: unknown[]) {
      return calendarClientMocks.getSetting(...args);
    }

    listSettings(...args: unknown[]) {
      return calendarClientMocks.listSettings(...args);
    }

    updateCalendarListEntry(...args: unknown[]) {
      return calendarClientMocks.updateCalendarListEntry(...args);
    }

    updateEvent(...args: unknown[]) {
      return calendarClientMocks.updateEvent(...args);
    }
  }
}));

import { provider } from './index';

let createCalendarToolTestClient = () =>
  createLocalSlateTestClient({
    slate: provider as any,
    state: {
      config: {},
      auth: {
        authenticationMethodId: 'oauth',
        output: { token: 'test-token' }
      }
    }
  });

describe('Google Calendar tool validation and behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('responds as the authenticated attendee without replacing other attendees', async () => {
    calendarClientMocks.getEvent.mockResolvedValue({
      id: 'event-1',
      summary: 'Planning',
      attendees: [
        { email: 'other@example.com', responseStatus: 'accepted' },
        { email: 'me@example.com', self: true, responseStatus: 'needsAction' }
      ]
    });
    calendarClientMocks.updateEvent.mockResolvedValue({
      id: 'event-1',
      summary: 'Planning',
      updated: '2026-07-14T10:00:00Z'
    });
    let client = createCalendarToolTestClient();

    let result = await client.invokeTool('respond_to_event', {
      eventId: 'event-1',
      responseStatus: 'accepted',
      comment: 'See you there',
      sendUpdates: 'all'
    });

    expect(calendarClientMocks.updateEvent).toHaveBeenCalledWith(
      'primary',
      'event-1',
      {
        attendees: [
          {
            email: 'me@example.com',
            responseStatus: 'accepted',
            comment: 'See you there'
          }
        ],
        attendeesOmitted: true
      },
      { sendUpdates: 'all' }
    );
    expect(result.output).toMatchObject({
      eventId: 'event-1',
      attendeeEmail: 'me@example.com',
      responseStatus: 'accepted',
      comment: 'See you there'
    });
  });

  it('skips attendees without an email and records the response from the patch result', async () => {
    calendarClientMocks.getEvent.mockResolvedValue({
      id: 'event-1',
      summary: 'Planning',
      attendees: [
        { displayName: 'Room 1', responseStatus: 'accepted' },
        { email: 'me@example.com', self: true, responseStatus: 'needsAction' }
      ]
    });
    calendarClientMocks.updateEvent.mockResolvedValue({
      id: 'event-1',
      summary: 'Planning',
      attendees: [
        { displayName: 'Room 1', responseStatus: 'accepted' },
        {
          email: 'ME@example.com',
          self: true,
          responseStatus: 'tentative',
          comment: 'Recorded by Google'
        }
      ]
    });
    let client = createCalendarToolTestClient();

    let result = await client.invokeTool('respond_to_event', {
      eventId: 'event-1',
      responseStatus: 'tentative',
      comment: 'Might join'
    });

    expect(result.output).toMatchObject({
      attendeeEmail: 'me@example.com',
      responseStatus: 'tentative',
      comment: 'Recorded by Google'
    });
  });

  it('rejects an RSVP when no attendee can be selected', async () => {
    calendarClientMocks.getEvent.mockResolvedValue({
      id: 'event-1',
      attendees: [{ email: 'other@example.com' }]
    });
    let client = createCalendarToolTestClient();

    await expectSlateError(
      () =>
        client.invokeTool('respond_to_event', {
          eventId: 'event-1',
          responseStatus: 'declined'
        }),
      'Event event-1 does not include an attendee marked as the authenticated user. Provide attendeeEmail to select an attendee explicitly.'
    );
    expect(calendarClientMocks.updateEvent).not.toHaveBeenCalled();
  });

  it('gets one setting or lists paginated settings', async () => {
    calendarClientMocks.getSetting.mockResolvedValue({ id: 'timezone', value: 'UTC' });
    calendarClientMocks.listSettings.mockResolvedValue({
      items: [{ id: 'weekStart', value: '1' }],
      nextPageToken: 'next-page'
    });
    let client = createCalendarToolTestClient();

    let single = await client.invokeTool('get_settings', { settingId: 'timezone' });
    let list = await client.invokeTool('get_settings', {
      maxResults: 25,
      pageToken: 'page-1',
      syncToken: 'sync-1'
    });

    expect(calendarClientMocks.getSetting).toHaveBeenCalledWith('timezone');
    expect(calendarClientMocks.listSettings).toHaveBeenCalledWith({
      maxResults: 25,
      pageToken: 'page-1',
      syncToken: 'sync-1'
    });
    expect(single.output.settings).toEqual([{ settingId: 'timezone', value: 'UTC' }]);
    expect(list.output).toMatchObject({
      settings: [{ settingId: 'weekStart', value: '1' }],
      nextPageToken: 'next-page',
      totalResults: 1
    });
  });

  it('returns ordered per-item results and continues after a failed batch item', async () => {
    calendarClientMocks.createEvent.mockResolvedValue({
      id: 'created-event',
      summary: 'Created',
      status: 'confirmed'
    });
    calendarClientMocks.updateEvent.mockRejectedValue(new Error('provider rejected update'));
    calendarClientMocks.deleteEvent.mockResolvedValue(undefined);
    let client = createCalendarToolTestClient();

    let result = await client.invokeTool('batch_modify_events', {
      operations: [
        {
          op: 'create',
          summary: 'Created',
          start: { dateTime: '2026-07-20T10:00:00Z' },
          end: { dateTime: '2026-07-20T11:00:00Z' }
        },
        { op: 'update', eventId: 'event-2', summary: 'Updated' },
        { op: 'delete', eventId: 'event-3' }
      ]
    });

    expect(result.output.successCount).toBe(2);
    expect(result.output.errorCount).toBe(1);
    expect(result.output.results).toMatchObject([
      { index: 0, op: 'create', success: true, eventId: 'created-event' },
      {
        index: 1,
        op: 'update',
        success: false,
        eventId: 'event-2',
        error:
          'Google Calendar API update event for batch item 1 failed: provider rejected update'
      },
      { index: 2, op: 'delete', success: true, eventId: 'event-3' }
    ]);
    expect(calendarClientMocks.deleteEvent).toHaveBeenCalledWith('primary', 'event-3', {
      sendUpdates: undefined
    });
  });

  it('reports branch validation failures as per-item batch errors', async () => {
    let client = createCalendarToolTestClient();

    let result = await client.invokeTool('batch_modify_events', {
      operations: [{ op: 'update', summary: 'No ID' }, { op: 'create' }]
    });

    expect(result.output).toMatchObject({
      successCount: 0,
      errorCount: 2,
      results: [
        { success: false, error: 'Operation 0 requires eventId for update.' },
        {
          success: false,
          error: 'Operation 1 requires summary, start, and end for create.'
        }
      ]
    });
    expect(calendarClientMocks.createEvent).not.toHaveBeenCalled();
    expect(calendarClientMocks.updateEvent).not.toHaveBeenCalled();
  });

  it('updates only the requested calendar subscription properties', async () => {
    calendarClientMocks.updateCalendarListEntry.mockResolvedValue({
      id: 'calendar-1',
      summary: 'Team',
      hidden: true,
      selected: false,
      summaryOverride: 'Project Team'
    });
    let client = createCalendarToolTestClient();

    let result = await client.invokeTool('manage_calendar', {
      action: 'update_subscription',
      calendarId: 'calendar-1',
      hidden: true,
      selected: false,
      summaryOverride: 'Project Team'
    });

    expect(calendarClientMocks.updateCalendarListEntry).toHaveBeenCalledWith('calendar-1', {
      colorId: undefined,
      hidden: true,
      selected: false,
      summaryOverride: 'Project Team'
    });
    expect(result.output).toMatchObject({
      calendarId: 'calendar-1',
      action: 'update_subscription',
      hidden: true,
      selected: false,
      summaryOverride: 'Project Team'
    });
  });

  it('rejects an empty calendar subscription update as a user-facing error', async () => {
    let client = createCalendarToolTestClient();

    await expectSlateError(
      () =>
        client.invokeTool('manage_calendar', {
          action: 'update_subscription',
          calendarId: 'calendar-1'
        }),
      'Provide at least one of colorId, hidden, selected, or summaryOverride for update_subscription.'
    );
    expect(calendarClientMocks.updateCalendarListEntry).not.toHaveBeenCalled();
  });
});
