import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'textcortex',
  name: 'TextCortex',
  description:
    'Discover AI models and generate, rewrite, summarize, translate, and draft content with TextCortex.',
  metadata: {},
  config,
  auth
});
