import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'ntfy',
  name: 'Ntfy',
  description:
    'Send push notifications to phones and desktops via HTTP-based pub-sub topics using the ntfy notification service.',
  metadata: {},
  config,
  auth
});
