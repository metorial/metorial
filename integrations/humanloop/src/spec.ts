import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'humanloop',
  name: 'Humanloop',
  description:
    'LLM development platform providing evaluation, prompt management, and observability tooling for building AI applications with large language models.',
  metadata: {},
  config,
  auth
});
