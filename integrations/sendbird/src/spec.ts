import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'sendbird',
  name: 'Sendbird',
  description:
    'Sendbird provides APIs for real-time chat messaging, voice/video calls, and business messaging.',
  metadata: {},
  config,
  auth
});
