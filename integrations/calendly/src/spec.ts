import { SlateSpecification } from '@slates/provider';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'calendly',
  name: 'Calendly',
  description:
    'Scheduling platform for creating event types, sharing booking links, managing availability, and handling scheduled events via the Calendly API v2.',
  metadata: {},
  config,
  auth
});
