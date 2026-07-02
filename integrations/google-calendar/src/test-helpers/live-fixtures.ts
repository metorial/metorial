import {
  createSlatesTestClient,
  expectToolCall,
  loadSlatesProfile,
  type SlatesTestClient
} from '@slates/test';

export interface GoogleCalendarLiveHarness {
  client: SlatesTestClient;
  profile: Awaited<ReturnType<typeof loadSlatesProfile>>;
  runId: string;
  trackedCalendars: string[];
  trackedEvents: Array<{
    calendarId: string;
    eventId: string;
  }>;
}

export let createRunId = () =>
  `slates-google-calendar-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export let createGoogleCalendarLiveHarness = async (): Promise<GoogleCalendarLiveHarness> => {
  let [client, profile] = await Promise.all([createSlatesTestClient(), loadSlatesProfile()]);

  return {
    client,
    profile,
    runId: createRunId(),
    trackedCalendars: [],
    trackedEvents: []
  };
};

export let GOOGLE_CALENDAR_REQUIRED_LIVE_SCOPE_SETS = [
  ['https://www.googleapis.com/auth/calendar'],
  [
    'https://www.googleapis.com/auth/calendar.events',
    'https://www.googleapis.com/auth/calendar.calendars',
    'https://www.googleapis.com/auth/calendar.calendarlist',
    'https://www.googleapis.com/auth/calendar.acls',
    'https://www.googleapis.com/auth/calendar.freebusy'
  ]
] as const;

let getPrimaryAuthScopes = (harness: GoogleCalendarLiveHarness) => {
  let firstAuth = Object.values(harness.profile.auth)[0];
  return new Set(firstAuth?.scopes ?? []);
};

export let requireGoogleCalendarScopes = (
  harness: GoogleCalendarLiveHarness,
  requiredScopeSets = GOOGLE_CALENDAR_REQUIRED_LIVE_SCOPE_SETS
) => {
  let grantedScopes = getPrimaryAuthScopes(harness);

  for (let scopeSet of requiredScopeSets) {
    let missingScopes = scopeSet.filter(scope => !grantedScopes.has(scope));
    if (missingScopes.length === 0) {
      return null;
    }
  }

  let preferredScopes = requiredScopeSets[1] ?? requiredScopeSets[0] ?? [];
  let missingScopes = preferredScopes.filter(scope => !grantedScopes.has(scope));

  return `The selected Google Calendar profile is missing required OAuth scopes for the live suite: ${missingScopes.join(
    ', '
  )}. Re-authenticate the profile with the full Google Calendar scope set before running the live tests.`;
};

export let labelForRun = (harness: GoogleCalendarLiveHarness, label: string) =>
  `${harness.runId} ${label}`;

export let trackCalendar = (harness: GoogleCalendarLiveHarness, calendarId: string) => {
  harness.trackedCalendars.unshift(calendarId);
  return calendarId;
};

export let trackEvent = (
  harness: GoogleCalendarLiveHarness,
  calendarId: string,
  eventId: string
) => {
  harness.trackedEvents.unshift({ calendarId, eventId });
  return eventId;
};

export let untrackEvent = (
  harness: GoogleCalendarLiveHarness,
  calendarId: string,
  eventId: string
) => {
  harness.trackedEvents = harness.trackedEvents.filter(
    tracked => tracked.calendarId !== calendarId || tracked.eventId !== eventId
  );
};

export let createManagedCalendar = async (
  harness: GoogleCalendarLiveHarness,
  label: string
) => {
  let result: any;

  try {
    result = await expectToolCall({
      client: harness.client,
      toolId: 'manage_calendar',
      input: {
        action: 'create',
        summary: labelForRun(harness, label),
        description: `Created by automated tests for ${harness.runId}`,
        timeZone: 'UTC'
      }
    });
  } catch (error) {
    let message = error instanceof Error ? error.message : String(error);
    if (!message.includes('Calendar usage limits exceeded')) {
      throw error;
    }

    let calendars = await expectToolCall({
      client: harness.client,
      toolId: 'list_calendars',
      input: {
        showHidden: true
      }
    });

    let reusableCalendar =
      calendars.output.calendars.find(
        (calendar: {
          calendarId?: string;
          summary?: string;
          accessRole?: string;
          primary?: boolean;
        }) =>
          calendar.calendarId &&
          !calendar.primary &&
          calendar.accessRole === 'owner' &&
          calendar.summary?.includes('slates-google-calendar-')
      ) ??
      calendars.output.calendars.find(
        (calendar: { calendarId?: string; accessRole?: string; primary?: boolean }) =>
          calendar.calendarId && !calendar.primary && calendar.accessRole === 'owner'
      );

    if (!reusableCalendar?.calendarId) {
      throw error;
    }

    return {
      calendarId: reusableCalendar.calendarId,
      result: {
        output: {
          calendarId: reusableCalendar.calendarId
        }
      }
    };
  }

  let calendarId = result.output.calendarId;
  if (!calendarId) {
    throw new Error(`Expected manage_calendar:create to return a calendarId for ${label}.`);
  }

  trackCalendar(harness, calendarId);
  return {
    calendarId,
    result
  };
};

export let createTimedRange = (daysFromNow: number, durationMinutes = 30) => {
  let start = new Date();
  start.setUTCDate(start.getUTCDate() + daysFromNow);
  start.setUTCHours(15, 0, 0, 0);

  let end = new Date(start);
  end.setUTCMinutes(end.getUTCMinutes() + durationMinutes);

  return {
    start: start.toISOString(),
    end: end.toISOString()
  };
};

export let createQuickAddText = (harness: GoogleCalendarLiveHarness, daysFromNow = 5) => {
  let target = new Date();
  target.setUTCDate(target.getUTCDate() + daysFromNow);

  let month = target.toLocaleString('en-US', { month: 'long', timeZone: 'UTC' });
  let day = target.getUTCDate();
  let year = target.getUTCFullYear();

  return `${labelForRun(harness, 'quick add')} on ${month} ${day}, ${year} at 3:00 PM UTC`;
};

export let cleanupGoogleCalendarLiveHarness = async (harness: GoogleCalendarLiveHarness) => {
  let errors: unknown[] = [];

  for (let trackedEvent of harness.trackedEvents.splice(0)) {
    try {
      await harness.client.invokeTool('delete_event', {
        calendarId: trackedEvent.calendarId,
        eventId: trackedEvent.eventId,
        sendUpdates: 'none'
      });
    } catch (error) {
      errors.push(error);
    }
  }

  for (let calendarId of harness.trackedCalendars.splice(0)) {
    try {
      await harness.client.invokeTool('manage_calendar', {
        action: 'delete',
        calendarId
      });
    } catch (error) {
      errors.push(error);
    }
  }

  return errors;
};
