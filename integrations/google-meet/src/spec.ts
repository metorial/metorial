import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'google-meet',
  name: 'Google Meet',
  description: undefined,
  metadata: {},
  config,
  auth
});
