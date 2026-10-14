import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'mailersend',
  name: 'MailerSend',
  description:
    'Transactional email and SMS messaging service with email verification, template management, sending domains, and delivery activity.',
  metadata: {},
  config,
  auth
});
