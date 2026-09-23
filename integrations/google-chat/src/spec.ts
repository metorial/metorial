import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'google-chat',
  name: 'Google Chat',
  description:
    'Google Chat integration for spaces, memberships, messages, reactions, attachments, space events, read state, notification settings, sidebar sections, custom emoji, and admin space search.',
  metadata: {},
  config,
  auth
});
