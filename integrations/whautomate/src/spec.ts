import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'whautomate',
  name: 'Whautomate',
  description:
    'Omnichannel customer engagement and automation platform supporting WhatsApp, Instagram, Telegram, Messenger and Live Chat with appointment booking, class management, invoicing, and broadcast capabilities.',
  metadata: {},
  config,
  auth
});
