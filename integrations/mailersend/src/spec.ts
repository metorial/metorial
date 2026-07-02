import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'mailersend',
  name: 'MailerSend',
  description:
    'Transactional email and SMS messaging service with email verification, template management, analytics, and inbound routing.',
  metadata: {},
  config,
  auth
});
