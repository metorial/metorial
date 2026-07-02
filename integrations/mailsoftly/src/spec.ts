import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'mailsoftly',
  name: 'Mailsoftly',
  description:
    'Email marketing and automation platform for managing contacts, contact lists, tags, and email campaigns.',
  metadata: {},
  config,
  auth
});
