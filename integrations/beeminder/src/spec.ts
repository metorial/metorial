import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'beeminder',
  name: 'Beeminder',
  description:
    'Goal-tracking service that uses financial commitment to enforce accountability. Track goals, manage datapoints, and stay on the Bright Red Line.',
  metadata: {},
  config,
  auth
});
