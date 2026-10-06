import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';
import { HUMANLOOP_SUNSET_DATE, HUMANLOOP_SUNSET_URL } from './lib/retirement';

export let spec = SlateSpecification.create({
  key: 'humanloop',
  name: 'Humanloop',
  description:
    'Retired: Humanloop shut down on September 8, 2025. Its platform and API are no longer available. Existing tools are retained for compatibility and report that the service is unavailable.',
  metadata: {
    deprecated: true,
    sunsetDate: HUMANLOOP_SUNSET_DATE,
    sunsetAnnouncementUrl: HUMANLOOP_SUNSET_URL
  },
  config,
  auth
});
