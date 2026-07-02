import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'anthropic',
  name: 'Anthropic',
  description:
    'AI research company providing access to the Claude family of large language models via a REST API.',
  metadata: {},
  config,
  auth
});
