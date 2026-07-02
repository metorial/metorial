import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'emailable',
  name: 'Emailable',
  description:
    'Email verification service that checks whether email addresses are valid, deliverable, and safe to send to.',
  metadata: {},
  config,
  auth
});
