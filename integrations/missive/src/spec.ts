import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'missive',
  name: 'Missive',
  description:
    'Collaborative team communication platform that unifies email, SMS, WhatsApp, live chat, Facebook Messenger, Instagram, and custom channels into a shared inbox.',
  metadata: {},
  config,
  auth
});
