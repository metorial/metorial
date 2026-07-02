import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'google-classroom',
  name: 'Google Classroom',
  description: undefined,
  metadata: {},
  config,
  auth
});
