import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'honeyhive',
  name: 'HoneyHive',
  description:
    'AI observability and evaluation platform for tracing, monitoring, and evaluating LLM applications and AI agents.',
  metadata: {},
  config,
  auth
});
