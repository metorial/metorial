import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'google-maps',
  name: 'Google Maps',
  description: undefined,
  metadata: {},
  config,
  auth
});
