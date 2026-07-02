import { SlateSpecification } from '@slates/provider';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'intercom',
  name: 'Intercom',
  description:
    'Customer messaging platform for live chat, email, tickets, and AI-powered support automation.',
  metadata: {},
  config,
  auth
});
