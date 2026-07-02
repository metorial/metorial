import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: '2chat',
  name: '2Chat',
  description:
    'Send and receive WhatsApp messages, manage contacts, groups, and phone calls through the 2Chat API.',
  metadata: {},
  config,
  auth
});
