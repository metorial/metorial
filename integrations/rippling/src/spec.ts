import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'rippling',
  name: 'Rippling',
  description:
    'Read workforce and company data with the Rippling v1 API, manage app groups and pending leave requests, and submit candidates through authorized partner onboarding.',
  metadata: {},
  config,
  auth
});
