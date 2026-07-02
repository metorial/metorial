import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'writer',
  name: 'Writer',
  description:
    'Enterprise AI platform built around the Palmyra family of large language models, providing text generation, chat completions, knowledge graphs, file management, and no-code agent invocation.',
  metadata: {},
  config,
  auth
});
