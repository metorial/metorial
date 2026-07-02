import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'linkedin-ads',
  name: 'LinkedIn Ads',
  description:
    'LinkedIn Ads integration for managing advertising campaigns, reporting, lead generation, and conversion tracking on the LinkedIn Marketing platform.',
  metadata: {},
  config,
  auth
});
