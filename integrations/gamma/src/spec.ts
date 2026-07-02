import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'gamma',
  name: 'Gamma',
  description:
    'AI-powered content creation platform for generating presentations, documents, social media posts, and websites from text prompts or templates.',
  metadata: {},
  config,
  auth
});
