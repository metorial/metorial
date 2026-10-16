import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'eventee',
  name: 'Eventee',
  description:
    'Eventee is an event management platform for in-person, virtual, and hybrid events. Read and manage event agendas, speakers, attendees, registrations and check-in.',
  metadata: {},
  config,
  auth
});
