import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'superchat',
  name: 'Superchat',
  description:
    'Unified messaging platform for businesses to send and receive messages across WhatsApp, Instagram, Facebook Messenger, Telegram, Email, and SMS from a single inbox.',
  metadata: {},
  config,
  auth
});
