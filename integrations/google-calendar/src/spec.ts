import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'google-calendar',
  name: 'Google Calendar',
  description:
    'Google Calendar integration for managing calendars, events, scheduling, and access control.',
  metadata: {},
  config,
  auth
});
