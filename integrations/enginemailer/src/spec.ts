import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'enginemailer',
  name: 'Enginemailer',
  description:
    'Cloud-based email marketing and automation platform for subscriber management, email campaigns, and transactional email delivery.',
  metadata: {},
  config,
  auth
});
