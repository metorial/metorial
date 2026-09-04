import type { SuperGoogleToolSource } from '@slates/super-google-tools';
import { provider as googleAdsProvider } from '@slates-integrations/google-ads';
import { provider as googleCalendarProvider } from '@slates-integrations/google-calendar';
import { provider as googleContactsProvider } from '@slates-integrations/google-contacts';
import { provider as googleDocsProvider } from '@slates-integrations/google-docs';
import { provider as googleFormsProvider } from '@slates-integrations/google-forms';
import { provider as googleMeetProvider } from '@slates-integrations/google-meet';
import { provider as googleSearchConsoleProvider } from '@slates-integrations/google-search-console';
import { provider as googleSheetsProvider } from '@slates-integrations/google-sheets';
import { provider as googleSlidesProvider } from '@slates-integrations/google-slides';
import { provider as googleTagManagerProvider } from '@slates-integrations/google-tag-manager';
import { provider as googleTasksProvider } from '@slates-integrations/google-tasks';

export let superGoogle2ASources = [
  { integration: 'google-docs', provider: googleDocsProvider },
  { integration: 'google-sheets', provider: googleSheetsProvider },
  { integration: 'google-slides', provider: googleSlidesProvider },
  { integration: 'google-forms', provider: googleFormsProvider },
  { integration: 'google-calendar', provider: googleCalendarProvider },
  { integration: 'google-meet', provider: googleMeetProvider },
  { integration: 'google-contacts', provider: googleContactsProvider },
  { integration: 'google-tasks', provider: googleTasksProvider },
  { integration: 'google-ads', provider: googleAdsProvider },
  { integration: 'google-search-console', provider: googleSearchConsoleProvider },
  { integration: 'google-tag-manager', provider: googleTagManagerProvider }
] satisfies SuperGoogleToolSource[];
