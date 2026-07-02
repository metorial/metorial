import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'smtp2go',
  name: 'SMTP2GO',
  description:
    'A scalable email and SMS service provider that simplifies delivery for everyday senders and businesses, ensuring messages arrive reliably and securely.',
  metadata: {},
  config,
  auth
});
