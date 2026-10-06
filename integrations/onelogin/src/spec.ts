import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'onelogin',
  name: 'OneLogin',
  description:
    'Read and manage OneLogin users, roles and SSO applications, inspect groups and audit events, and perform supported MFA enrollment using tenant-bound API credentials.',
  metadata: {},
  config,
  auth
});
