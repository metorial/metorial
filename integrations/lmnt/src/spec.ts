import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'lmnt',
  name: 'LMNT',
  description:
    'Retired integration: LMNT has shut down its speech generation service. Existing tool contracts remain available for compatibility and report that the provider is unavailable.',
  metadata: { deprecated: true, retirementNoticeUrl: 'https://docs.lmnt.com/' },
  config,
  auth
});
