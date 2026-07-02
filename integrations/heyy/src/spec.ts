import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'heyy',
  name: 'Heyy',
  description:
    'Customer messaging platform that unifies WhatsApp, Instagram, Facebook Messenger, and website live chat into a single inbox with AI-powered automation.',
  metadata: {},
  config,
  auth
});
