import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'google-chat',
  name: 'Google Chat',
  description:
    'Google Chat integration for spaces, memberships, messages, reactions, attachments, and space events.',
  metadata: {},
  config,
  auth
});
