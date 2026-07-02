import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'auth0',
  name: 'Auth 0',
  description: undefined,
  metadata: {},
  config,
  auth
});
