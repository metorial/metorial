import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'google-contacts',
  name: 'Google Contacts',
  description: undefined,
  metadata: {},
  config,
  auth
});
