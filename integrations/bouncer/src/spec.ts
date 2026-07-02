import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'bouncer',
  name: 'Bouncer',
  description:
    'Email verification and validation platform for checking deliverability, detecting disposable and toxic addresses, and validating domains.',
  metadata: {},
  config,
  auth
});
