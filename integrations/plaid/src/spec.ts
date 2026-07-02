import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'plaid',
  name: 'Plaid',
  description: undefined,
  metadata: {},
  config,
  auth
});
