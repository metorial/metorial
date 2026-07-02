import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'neverbounce',
  name: 'NeverBounce',
  description:
    'Email verification and list cleaning service that validates email addresses as valid, invalid, disposable, catchall, or unknown.',
  metadata: {},
  config,
  auth
});
