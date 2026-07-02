import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'docsbot-ai',
  name: 'DocsBot AI',
  description:
    'Create and manage custom AI chatbots trained on your documentation, websites, and content sources. Supports automated customer support, content generation, and multi-turn conversations.',
  metadata: {},
  config,
  auth
});
