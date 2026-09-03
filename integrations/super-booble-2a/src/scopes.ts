import type { GoogleOAuthScopeDescriptor } from '@slates/oauth-google';
import {
  type SuperGoogle2AVerificationScope,
  superGoogle2AVerificationScopeList
} from './scope-envelope';

// Identity scopes used by the connection profile lookup (Google userinfo endpoint).
export let superGoogle2AProfileScopes = [
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
] as const;

export let superGoogle2AActionSpecificToolScopes = [
  {
    toolKey: 'manage_container',
    operation: 'delete',
    scope: 'https://www.googleapis.com/auth/tagmanager.delete.containers'
  },
  {
    toolKey: 'manage_version',
    operation: 'create',
    scope: 'https://www.googleapis.com/auth/tagmanager.edit.containerversions'
  },
  {
    toolKey: 'manage_version',
    operation: 'publish',
    scope: 'https://www.googleapis.com/auth/tagmanager.publish'
  }
] as const;

// Declared and requested for planned tools or as narrower alternatives; referenced by no
// retained tool clause today. Kept explicit so the contract test can account for every
// requested scope.
export let superGoogle2AFutureToolScopes = [
  'https://www.googleapis.com/auth/calendar.calendars.readonly',
  'https://www.googleapis.com/auth/calendar.acls.readonly'
] as const;

let describe = (title: string, description: string) => ({ title, description });

// Typed against the envelope so a missing or extra entry fails compilation.
let superGoogle2AScopeCopy: Record<
  SuperGoogle2AVerificationScope,
  { title: string; description: string }
> = {
  'https://www.googleapis.com/auth/meetings.space.created': describe(
    'Google Meet spaces',
    'Create and manage meeting spaces, members, conference records, and artifacts through this connection.'
  ),
  'https://www.googleapis.com/auth/meetings.space.readonly': describe(
    'Google Meet spaces read',
    'Read metadata about any meeting space the account has access to.'
  ),
  'https://www.googleapis.com/auth/meetings.space.settings': describe(
    'Google Meet space settings',
    'Edit and view the settings, including auto-recording and transcription, for Google Meet calls.'
  ),
  'https://www.googleapis.com/auth/calendar': describe(
    'Google Calendar',
    'Manage calendars, events, sharing, settings, and availability.'
  ),
  'https://www.googleapis.com/auth/calendar.readonly': describe(
    'Google Calendar read',
    'View calendars and events.'
  ),
  'https://www.googleapis.com/auth/calendar.events': describe(
    'Calendar events',
    'View and edit events on all calendars.'
  ),
  'https://www.googleapis.com/auth/calendar.events.readonly': describe(
    'Calendar events read',
    'View events on all calendars.'
  ),
  'https://www.googleapis.com/auth/calendar.events.owned': describe(
    'Owned calendar events',
    'View and edit events on calendars the account owns.'
  ),
  'https://www.googleapis.com/auth/calendar.events.owned.readonly': describe(
    'Owned calendar events read',
    'View events on calendars the account owns.'
  ),
  'https://www.googleapis.com/auth/calendar.events.freebusy': describe(
    'Calendar event availability',
    'View the availability of events on calendars.'
  ),
  'https://www.googleapis.com/auth/calendar.events.public.readonly': describe(
    'Public calendar events read',
    'View events on public calendars.'
  ),
  'https://www.googleapis.com/auth/calendar.freebusy': describe(
    'Calendar free/busy',
    'View free/busy availability for calendars.'
  ),
  'https://www.googleapis.com/auth/calendar.settings.readonly': describe(
    'Calendar settings read',
    'View Google Calendar user settings.'
  ),
  'https://www.googleapis.com/auth/calendar.calendars': describe(
    'Calendars',
    'View and manage calendar properties.'
  ),
  'https://www.googleapis.com/auth/calendar.calendars.readonly': describe(
    'Calendars read',
    'View calendar properties.'
  ),
  'https://www.googleapis.com/auth/calendar.calendarlist': describe(
    'Calendar list',
    'View and manage the list of subscribed calendars.'
  ),
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly': describe(
    'Calendar list read',
    'View the list of subscribed calendars.'
  ),
  'https://www.googleapis.com/auth/calendar.acls': describe(
    'Calendar sharing',
    'View and manage calendar sharing rules.'
  ),
  'https://www.googleapis.com/auth/calendar.acls.readonly': describe(
    'Calendar sharing read',
    'View calendar sharing rules.'
  ),
  'https://www.googleapis.com/auth/calendar.app.created': describe(
    'Calendar secondary calendars created by this connection',
    'Create and manage secondary calendars and their events created through this connection.'
  ),
  'https://www.googleapis.com/auth/contacts': describe(
    'Google Contacts',
    'Read and manage contacts and contact groups.'
  ),
  'https://www.googleapis.com/auth/contacts.readonly': describe(
    'Google Contacts read',
    'View contacts and contact groups.'
  ),
  'https://www.googleapis.com/auth/contacts.other.readonly': describe(
    'Other contacts',
    'Read other contacts and copy selected people into contacts.'
  ),
  'https://www.googleapis.com/auth/directory.readonly': describe(
    'Directory',
    'Search the organization directory.'
  ),
  'https://www.googleapis.com/auth/tasks': describe(
    'Google Tasks',
    'Read and manage task lists and tasks.'
  ),
  'https://www.googleapis.com/auth/tasks.readonly': describe(
    'Google Tasks read',
    'View task lists and tasks.'
  ),
  'https://www.googleapis.com/auth/adwords': describe(
    'Google Ads',
    'Read and manage authorized Google Ads accounts.'
  ),
  'https://www.googleapis.com/auth/webmasters': describe(
    'Search Console',
    'Read and manage Search Console sites and sitemaps.'
  ),
  'https://www.googleapis.com/auth/webmasters.readonly': describe(
    'Search Console read',
    'View Search Console data for verified sites.'
  ),
  'https://www.googleapis.com/auth/tagmanager.readonly': describe(
    'Tag Manager read',
    'View Tag Manager accounts, containers, and their contents.'
  ),
  'https://www.googleapis.com/auth/tagmanager.edit.containers': describe(
    'Tag Manager containers',
    'Read and manage Tag Manager containers and workspaces.'
  ),
  'https://www.googleapis.com/auth/tagmanager.edit.containerversions': describe(
    'Tag Manager versions',
    'Read and manage Tag Manager container versions.'
  ),
  'https://www.googleapis.com/auth/tagmanager.delete.containers': describe(
    'Tag Manager container deletion',
    'Delete Tag Manager containers when explicitly requested.'
  ),
  'https://www.googleapis.com/auth/tagmanager.manage.accounts': describe(
    'Tag Manager accounts',
    'Manage Tag Manager account settings.'
  ),
  'https://www.googleapis.com/auth/tagmanager.manage.users': describe(
    'Tag Manager users',
    'Read and manage Tag Manager user permissions.'
  ),
  'https://www.googleapis.com/auth/tagmanager.publish': describe(
    'Tag Manager publishing',
    'Publish Tag Manager container versions and environments.'
  ),
  'https://www.googleapis.com/auth/documents': describe(
    'Google Docs',
    'Read and manage Google Docs documents.'
  ),
  'https://www.googleapis.com/auth/documents.readonly': describe(
    'Google Docs read',
    'View Google Docs documents.'
  ),
  'https://www.googleapis.com/auth/spreadsheets': describe(
    'Google Sheets',
    'Read and manage Google Sheets spreadsheets.'
  ),
  'https://www.googleapis.com/auth/spreadsheets.readonly': describe(
    'Google Sheets read',
    'View Google Sheets spreadsheets.'
  ),
  'https://www.googleapis.com/auth/presentations': describe(
    'Google Slides',
    'Read and manage Google Slides presentations.'
  ),
  'https://www.googleapis.com/auth/presentations.readonly': describe(
    'Google Slides read',
    'View Google Slides presentations.'
  ),
  'https://www.googleapis.com/auth/forms.body': describe(
    'Google Forms',
    'Read and manage Google Forms.'
  ),
  'https://www.googleapis.com/auth/forms.body.readonly': describe(
    'Google Forms read',
    'View Google Forms.'
  ),
  'https://www.googleapis.com/auth/forms.responses.readonly': describe(
    'Google Forms responses',
    'Read responses submitted to Google Forms.'
  ),
  'https://www.googleapis.com/auth/drive.file': describe(
    'Drive files created or opened with this connection',
    'View and manage Drive files created or opened by Docs, Sheets, Slides, and Forms through this connection.'
  ),
  'https://www.googleapis.com/auth/userinfo.email': describe(
    'Google account email',
    'Read the connected Google account email address.'
  ),
  'https://www.googleapis.com/auth/userinfo.profile': describe(
    'Google account profile',
    'Read the connected Google account name and profile image.'
  )
};

// The consent screen requests the complete P2A project declaration in Console order, future-tool
// scopes included, so the consent screen matches the verified declaration exactly.
export let superGoogle2AScopes = superGoogle2AVerificationScopeList.map(scope => ({
  ...superGoogle2AScopeCopy[scope],
  scope
})) satisfies GoogleOAuthScopeDescriptor[];

export let superGoogle2AScopeValues: string[] = superGoogle2AScopes.map(
  descriptor => descriptor.scope
);
