import { SlateSpecification } from '@slates/provider';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'openai',
  name: 'OpenAI',
  description:
    'Cloud-based AI platform offering access to large language models, image generation, audio models, video generation, and embedding models through a REST API.',
  metadata: {},
  config,
  auth
});
