import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'mailerlite',
  name: 'MailerLite',
  description:
    'Email marketing platform for subscriber management, campaign creation, automations, signup forms, and webhooks.',
  metadata: {},
  config,
  auth
});
