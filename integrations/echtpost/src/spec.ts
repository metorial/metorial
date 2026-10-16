import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'echtpost',
  name: 'Echtpost',
  description:
    'Send physical postcards from saved EchtPost templates. Manage contacts and groups, check balance and prices, and inspect or cancel scheduled postcards.',
  metadata: {},
  config,
  auth
});
