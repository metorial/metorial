import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'mixmax',
  name: 'Mixmax',
  description:
    'Sales engagement platform with email tracking, sequences, templates, meeting scheduling, and CRM integration.',
  metadata: {},
  config,
  auth
});
