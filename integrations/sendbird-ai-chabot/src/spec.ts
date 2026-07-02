import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'sendbird-ai-chatbot',
  name: 'Sendbird AI Chatbot',
  description:
    'Integration with Sendbird AI Chatbot platform for creating and managing AI-powered chatbots, sending messages, generating AI replies, and handling chat events.',
  metadata: {},
  config,
  auth
});
