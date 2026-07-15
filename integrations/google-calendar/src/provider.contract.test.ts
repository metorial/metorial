import { createLocalSlateTestClient, expectSlateContract } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';
import { googleCalendarActionScopes } from './scopes';

describe('google-calendar provider contract', () => {
  it('exposes the expected provider, tool, trigger, and auth surface', async () => {
    let client = createLocalSlateTestClient({ slate: provider });
    let contract = await expectSlateContract({
      client,
      provider: {
        id: 'google-calendar',
        name: 'Google Calendar',
        description:
          'Google Calendar integration for managing calendars, events, scheduling, and access control.'
      },
      toolIds: [
        'create_event',
        'list_events',
        'get_event',
        'respond_to_event',
        'update_event',
        'batch_modify_events',
        'delete_event',
        'quick_add_event',
        'list_calendars',
        'manage_calendar',
        'find_free_busy',
        'manage_sharing',
        'get_colors',
        'get_settings'
      ],
      triggerIds: ['event_changes', 'calendar_list_changes'],
      authMethodIds: ['oauth'],
      tools: [
        { id: 'create_event', readOnly: false, destructive: false },
        { id: 'list_events', readOnly: true, destructive: false },
        { id: 'get_event', readOnly: true, destructive: false },
        { id: 'respond_to_event', readOnly: false, destructive: false },
        { id: 'update_event', readOnly: false, destructive: false },
        { id: 'batch_modify_events', readOnly: false, destructive: true },
        { id: 'delete_event', readOnly: false, destructive: true },
        { id: 'quick_add_event', readOnly: false, destructive: false },
        { id: 'list_calendars', readOnly: true, destructive: false },
        { id: 'manage_calendar', readOnly: false, destructive: true },
        { id: 'find_free_busy', readOnly: true, destructive: false },
        { id: 'manage_sharing', readOnly: false, destructive: true },
        { id: 'get_colors', readOnly: true, destructive: false },
        { id: 'get_settings', readOnly: true, destructive: false }
      ],
      triggers: [
        { id: 'event_changes', invocationType: 'webhook' },
        { id: 'calendar_list_changes', invocationType: 'webhook' }
      ]
    });

    expect(contract.actions).toHaveLength(16);
    expect(Object.keys(contract.configSchema.properties ?? {})).toEqual([]);

    let expectedScopes = {
      create_event: googleCalendarActionScopes.createEvent,
      list_events: googleCalendarActionScopes.listEvents,
      get_event: googleCalendarActionScopes.getEvent,
      respond_to_event: googleCalendarActionScopes.respondToEvent,
      update_event: googleCalendarActionScopes.updateEvent,
      batch_modify_events: googleCalendarActionScopes.batchModifyEvents,
      delete_event: googleCalendarActionScopes.deleteEvent,
      quick_add_event: googleCalendarActionScopes.quickAddEvent,
      list_calendars: googleCalendarActionScopes.listCalendars,
      manage_calendar: googleCalendarActionScopes.manageCalendar,
      find_free_busy: googleCalendarActionScopes.findFreeBusy,
      manage_sharing: googleCalendarActionScopes.manageSharing,
      get_colors: googleCalendarActionScopes.getColors,
      get_settings: googleCalendarActionScopes.getSettings,
      event_changes: googleCalendarActionScopes.eventChanges,
      calendar_list_changes: googleCalendarActionScopes.calendarListChanges
    };

    for (let [actionId, scopes] of Object.entries(expectedScopes)) {
      expect(contract.actions.find(action => action.id === actionId)?.scopes).toEqual(scopes);
    }

    let oauth = await client.getAuthMethod('oauth');
    expect(oauth.authenticationMethod.type).toBe('auth.oauth');
    expect(oauth.authenticationMethod.capabilities.handleTokenRefresh?.enabled).toBe(true);
    expect(oauth.authenticationMethod.capabilities.getProfile?.enabled).toBe(true);

    let scopeTitles = new Set(
      (oauth.authenticationMethod.scopes ?? []).map(scope => scope.title)
    );
    expect(scopeTitles.has('Full Access')).toBe(true);
    expect(scopeTitles.has('Calendar List')).toBe(true);
    expect(scopeTitles.has('User Email')).toBe(true);
  });
});
