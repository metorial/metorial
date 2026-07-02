import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'mailcheck',
  name: 'Mailcheck',
  description:
    'Email verification and validation service that checks whether email addresses are valid, deliverable, and trustworthy. Provides trust scores, social profile data, and supports both single email verification and bulk list cleaning.',
  metadata: {},
  config,
  auth
});
