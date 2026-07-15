import { allOf, anyOf } from 'slates';

export let googleCalendarScopes = {
  calendar: 'https://www.googleapis.com/auth/calendar',
  calendarReadonly: 'https://www.googleapis.com/auth/calendar.readonly',
  calendarEvents: 'https://www.googleapis.com/auth/calendar.events',
  calendarEventsReadonly: 'https://www.googleapis.com/auth/calendar.events.readonly',
  calendarEventsOwned: 'https://www.googleapis.com/auth/calendar.events.owned',
  calendarEventsOwnedReadonly:
    'https://www.googleapis.com/auth/calendar.events.owned.readonly',
  calendarEventsFreebusy: 'https://www.googleapis.com/auth/calendar.events.freebusy',
  calendarEventsPublicReadonly:
    'https://www.googleapis.com/auth/calendar.events.public.readonly',
  calendarFreebusy: 'https://www.googleapis.com/auth/calendar.freebusy',
  calendarSettingsReadonly: 'https://www.googleapis.com/auth/calendar.settings.readonly',
  calendarCalendars: 'https://www.googleapis.com/auth/calendar.calendars',
  calendarCalendarsReadonly: 'https://www.googleapis.com/auth/calendar.calendars.readonly',
  calendarCalendarList: 'https://www.googleapis.com/auth/calendar.calendarlist',
  calendarCalendarListReadonly:
    'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
  calendarAcls: 'https://www.googleapis.com/auth/calendar.acls',
  calendarAclsReadonly: 'https://www.googleapis.com/auth/calendar.acls.readonly',
  calendarAppCreated: 'https://www.googleapis.com/auth/calendar.app.created',
  userInfoProfile: 'https://www.googleapis.com/auth/userinfo.profile',
  userInfoEmail: 'https://www.googleapis.com/auth/userinfo.email'
} as const;

export let googleCalendarActionScopes = {
  createEvent: anyOf(
    googleCalendarScopes.calendar,
    googleCalendarScopes.calendarEvents,
    googleCalendarScopes.calendarAppCreated,
    googleCalendarScopes.calendarEventsOwned
  ),
  listEvents: anyOf(
    googleCalendarScopes.calendar,
    googleCalendarScopes.calendarReadonly,
    googleCalendarScopes.calendarEvents,
    googleCalendarScopes.calendarEventsReadonly,
    googleCalendarScopes.calendarEventsOwned,
    googleCalendarScopes.calendarEventsOwnedReadonly
  ),
  getEvent: anyOf(
    googleCalendarScopes.calendar,
    googleCalendarScopes.calendarReadonly,
    googleCalendarScopes.calendarEvents,
    googleCalendarScopes.calendarEventsReadonly,
    googleCalendarScopes.calendarEventsOwned,
    googleCalendarScopes.calendarEventsOwnedReadonly
  ),
  updateEvent: anyOf(
    googleCalendarScopes.calendar,
    googleCalendarScopes.calendarEvents,
    googleCalendarScopes.calendarEventsOwned
  ),
  respondToEvent: anyOf(
    googleCalendarScopes.calendar,
    googleCalendarScopes.calendarEvents,
    googleCalendarScopes.calendarEventsOwned
  ),
  batchModifyEvents: anyOf(
    googleCalendarScopes.calendar,
    googleCalendarScopes.calendarEvents,
    googleCalendarScopes.calendarAppCreated,
    googleCalendarScopes.calendarEventsOwned
  ),
  deleteEvent: anyOf(
    googleCalendarScopes.calendar,
    googleCalendarScopes.calendarEvents,
    googleCalendarScopes.calendarAppCreated,
    googleCalendarScopes.calendarEventsOwned
  ),
  quickAddEvent: anyOf(
    googleCalendarScopes.calendar,
    googleCalendarScopes.calendarEvents,
    googleCalendarScopes.calendarAppCreated,
    googleCalendarScopes.calendarEventsOwned
  ),
  listCalendars: anyOf(
    googleCalendarScopes.calendar,
    googleCalendarScopes.calendarReadonly,
    googleCalendarScopes.calendarCalendarList,
    googleCalendarScopes.calendarCalendarListReadonly
  ),
  manageCalendar: allOf(
    [
      googleCalendarScopes.calendar,
      googleCalendarScopes.calendarCalendars,
      googleCalendarScopes.calendarAppCreated
    ],
    [googleCalendarScopes.calendar, googleCalendarScopes.calendarCalendarList]
  ),
  findFreeBusy: anyOf(
    googleCalendarScopes.calendar,
    googleCalendarScopes.calendarReadonly,
    googleCalendarScopes.calendarEventsFreebusy,
    googleCalendarScopes.calendarFreebusy
  ),
  manageSharing: anyOf(googleCalendarScopes.calendar, googleCalendarScopes.calendarAcls),
  getColors: anyOf(
    googleCalendarScopes.calendar,
    googleCalendarScopes.calendarReadonly,
    googleCalendarScopes.calendarAppCreated,
    googleCalendarScopes.calendarCalendarList,
    googleCalendarScopes.calendarCalendarListReadonly,
    googleCalendarScopes.calendarEventsOwned,
    googleCalendarScopes.calendarEventsOwnedReadonly,
    googleCalendarScopes.calendarEventsPublicReadonly
  ),
  getSettings: anyOf(
    googleCalendarScopes.calendar,
    googleCalendarScopes.calendarReadonly,
    googleCalendarScopes.calendarSettingsReadonly
  ),
  eventChanges: anyOf(
    googleCalendarScopes.calendar,
    googleCalendarScopes.calendarReadonly,
    googleCalendarScopes.calendarEvents,
    googleCalendarScopes.calendarEventsReadonly,
    googleCalendarScopes.calendarEventsOwned,
    googleCalendarScopes.calendarEventsOwnedReadonly
  ),
  calendarListChanges: anyOf(
    googleCalendarScopes.calendar,
    googleCalendarScopes.calendarReadonly,
    googleCalendarScopes.calendarCalendarList,
    googleCalendarScopes.calendarCalendarListReadonly
  )
} as const;
