import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'motherduck',
  name: 'MotherDuck',
  description:
    'Query MotherDuck databases and manage Dives, Flights, and Guides through native SQL.',
  metadata: {},
  config,
  auth
});
