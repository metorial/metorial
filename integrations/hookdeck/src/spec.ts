import { SlateSpecification } from '@slates/provider';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'hookdeck',
  name: 'Hookdeck',
  description:
    'Event gateway platform for receiving, processing, routing, and delivering webhooks and asynchronous HTTP events.',
  metadata: {},
  config,
  auth
});
