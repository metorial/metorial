import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'textit',
  name: 'TextIt',
  description:
    'Cloud-based platform for building and managing interactive messaging workflows across SMS, voice, WhatsApp, Facebook Messenger, Telegram, and other channels.',
  metadata: {},
  config,
  auth
});
