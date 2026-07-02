import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'chatbotkit',
  name: 'ChatBotKit',
  description:
    'Conversational AI platform for building, managing, and deploying AI chatbots and agents with support for multiple AI models and deployment channels.',
  metadata: {},
  config,
  auth
});
