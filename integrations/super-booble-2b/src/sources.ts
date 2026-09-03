import type { SuperGoogleToolSource } from '@slates/super-google-tools';
import { provider as googleAdminProvider } from '@slates-integrations/google-admin';
import { provider as googlePhotosProvider } from '@slates-integrations/google-photos';
import { provider as youtubeProvider } from '@slates-integrations/youtube';
import { provider as youtubeAnalyticsProvider } from '@slates-integrations/youtube-analytics';

export let superGoogle2BSources = [
  { integration: 'google-photos', provider: googlePhotosProvider },
  { integration: 'youtube', provider: youtubeProvider },
  { integration: 'youtube-analytics', provider: youtubeAnalyticsProvider },
  { integration: 'google-admin', provider: googleAdminProvider }
] satisfies SuperGoogleToolSource[];
