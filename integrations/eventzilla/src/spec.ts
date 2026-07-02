import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'eventzilla',
  name: 'Eventzilla',
  description:
    'Event ticketing and marketing platform for selling tickets, processing payments, and managing attendees.',
  metadata: {},
  config,
  auth
});
