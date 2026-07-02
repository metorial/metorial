import { SlateSpecification } from '@slates/provider';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'facebook-messenger',
  name: 'Facebook Messenger',
  description:
    'Send and receive messages between Facebook Pages and users through Messenger. Supports text, media, templates, profile management, and real-time webhook events.',
  metadata: {},
  config,
  auth
});
