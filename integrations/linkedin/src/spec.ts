import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'linkedin',
  name: 'LinkedIn',
  description:
    'LinkedIn member profile and self-serve sharing via OpenID Connect and Share on LinkedIn. Organization and Community Management workflows should live in a separate slate because LinkedIn restricts combining those products in one app.',
  metadata: {},
  config,
  auth
});
