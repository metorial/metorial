import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'apipie-ai',
  name: 'APIpie AI',
  description:
    'AI super aggregator providing unified access to hundreds of AI models across language, image, voice, vision, embedding, and search categories from providers like OpenAI, Anthropic, Google, Meta, and more.',
  metadata: {},
  config,
  auth
});
