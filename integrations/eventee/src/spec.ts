import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'eventee',
  name: 'Eventee',
  description:
    'Eventee is an event management platform for in-person, virtual, and hybrid events. Manage event schedules, attendees, speakers, and registrations.',
  metadata: {},
  config,
  auth
});
