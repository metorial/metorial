import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'bigmailer',
  name: 'BigMailer',
  description:
    'Email marketing platform for agencies, franchises, and multi-brand businesses. Manage transactional and promotional emails across brands.',
  metadata: {},
  config,
  auth
});
