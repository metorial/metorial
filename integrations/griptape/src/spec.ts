import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'griptape',
  name: 'Griptape',
  description:
    'Griptape Cloud is a managed platform for building, deploying, and operating AI-powered applications with managed services for LLM-powered data prep, retrieval, agents, pipelines, and workflows.',
  metadata: {},
  config,
  auth
});
