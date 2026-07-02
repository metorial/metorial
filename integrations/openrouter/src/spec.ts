import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'openrouter',
  name: 'OpenRouter',
  description:
    'Unified API platform providing access to 400+ AI models from dozens of providers through a single endpoint.',
  metadata: {},
  config,
  auth
});
