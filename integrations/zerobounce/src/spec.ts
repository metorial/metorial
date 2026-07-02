import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'zerobounce',
  name: 'Zerobounce',
  description:
    'Email validation, AI scoring, and deliverability platform for verifying email addresses, finding business emails, and analyzing email activity.',
  metadata: {},
  config,
  auth
});
