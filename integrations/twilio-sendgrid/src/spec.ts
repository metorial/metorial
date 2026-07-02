import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'twilio-sendgrid',
  name: 'Twilio SendGrid',
  description:
    'Cloud-based email delivery platform for sending transactional and marketing emails at scale. Provides APIs for email sending, contact management, templates, analytics, and suppression management.',
  metadata: {},
  config,
  auth
});
