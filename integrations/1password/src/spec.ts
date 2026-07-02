import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: '1password',
  name: '1Password',
  description:
    'Password manager and secrets management platform. Manage vault items, generate passwords, retrieve secrets, and monitor account activity through audit, item usage, and sign-in events.',
  metadata: {},
  config,
  auth
});
