import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'demio',
  name: 'Demio',
  description:
    'Demio is a webinar and virtual event platform for hosting live, series, and automated webinars with registration management, attendee engagement, and integrations.',
  metadata: {},
  config,
  auth
});
