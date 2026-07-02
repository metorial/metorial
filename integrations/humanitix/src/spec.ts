import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'humanitix',
  name: 'Humanitix',
  description:
    'Not-for-profit ticketing platform where all booking fees are donated to charity. Retrieve events, orders, tickets, and tags.',
  metadata: {},
  config,
  auth
});
