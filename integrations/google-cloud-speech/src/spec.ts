import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'google-cloud-speech',
  name: 'Google Cloud Speech',
  description: undefined,
  metadata: {},
  config,
  auth
});
