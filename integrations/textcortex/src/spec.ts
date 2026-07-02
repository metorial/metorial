import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'textcortex',
  name: 'TextCortex',
  description:
    'AI-powered text generation and content creation platform supporting 25+ languages and multiple AI models.',
  metadata: {},
  config,
  auth
});
