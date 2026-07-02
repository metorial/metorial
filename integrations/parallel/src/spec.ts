import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'parallel',
  name: 'Parallel',
  description:
    'Web API platform built for AI agents providing web search, content extraction, deep research, entity discovery, chat completions, and continuous web monitoring capabilities.',
  metadata: {},
  config,
  auth
});
