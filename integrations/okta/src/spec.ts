import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'okta',
  name: 'Okta',
  description:
    'Cloud-based identity and access management platform for user authentication, authorization, and lifecycle management.',
  metadata: {},
  config,
  auth
});
