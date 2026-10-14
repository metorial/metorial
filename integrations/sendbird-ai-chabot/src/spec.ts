import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'sendbird-ai-chatbot',
  name: 'Sendbird AI Chatbot',
  description:
    'Create and manage Sendbird bots, discover joined group channels, send and retrieve messages, generate AI replies where enabled, and control typing indicators.',
  metadata: {},
  config,
  auth
});
