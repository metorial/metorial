import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'mailbluster',
  name: 'MailBluster',
  description:
    'Email marketing platform for managing leads, products, orders, and custom fields. Integrates with SMTP providers like Amazon SES, Postmark, and Mailgun for sending bulk email campaigns.',
  metadata: {},
  config,
  auth
});
