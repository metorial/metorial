import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'sendbird',
  name: 'Sendbird',
  description:
    'Manage Sendbird Chat users, channels, messages, channel membership, and moderation.',
  metadata: {},
  config,
  auth
});
