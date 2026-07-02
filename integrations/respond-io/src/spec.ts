import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'respondio',
  name: 'Respond.io',
  description:
    'Manage omnichannel customer messaging across WhatsApp, Facebook Messenger, Telegram, Viber, email, and web chat through the Respond.io platform.',
  metadata: {},
  config,
  auth
});
