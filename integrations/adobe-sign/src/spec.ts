import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'adobe-sign',
  name: 'Adobe Sign',
  description: undefined,
  metadata: {},
  config,
  auth
});
