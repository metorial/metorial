import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'pagerduty',
  name: 'PagerDuty',
  description:
    'Incident management platform for detecting, triaging, and resolving infrastructure and application incidents.',
  metadata: {},
  config,
  auth
});
