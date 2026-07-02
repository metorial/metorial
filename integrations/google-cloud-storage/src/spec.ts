import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'google-cloud-storage',
  name: 'Google Cloud Storage',
  description: undefined,
  metadata: {},
  config,
  auth
});
