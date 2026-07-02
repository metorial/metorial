import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'mailsso',
  name: 'Mails.so',
  description:
    'Email verification and validation service for checking deliverability, format validity, domain and MX record status, catch-all detection, disposable address detection, and blocklist presence.',
  metadata: {},
  config,
  auth
});
