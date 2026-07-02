import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'eventbrite',
  name: 'Eventbrite',
  description:
    'Event management and ticketing platform. Create, manage, and promote events, handle ticket sales and orders, track attendees and check-ins, and manage venues and organizer profiles.',
  metadata: {},
  config,
  auth
});
