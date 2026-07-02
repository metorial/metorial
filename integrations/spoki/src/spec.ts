import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'spoki',
  name: 'Spoki',
  description:
    'WhatsApp Business API platform for marketing, sales, and customer support. Manage contacts, send messages, run automations, and track deals.',
  metadata: {},
  config,
  auth
});
