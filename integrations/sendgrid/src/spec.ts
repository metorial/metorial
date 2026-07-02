import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'sendgrid',
  name: 'SendGrid',
  description:
    'Cloud-based email delivery platform for sending transactional and marketing emails, managing contacts and templates, and tracking email engagement.',
  metadata: {},
  config,
  auth
});
