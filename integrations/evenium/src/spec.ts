import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'evenium',
  name: 'Evenium',
  description:
    'Event management platform for invitation, registration, onsite check-in, attendee engagement, and virtual/hybrid event hosting.',
  metadata: {},
  config,
  auth
});
