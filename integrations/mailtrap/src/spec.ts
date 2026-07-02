import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'mailtrap',
  name: 'Mailtrap',
  description:
    'Email platform for sending transactional and bulk emails, sandbox testing, contact management, and delivery analytics.',
  metadata: {},
  config,
  auth
});
