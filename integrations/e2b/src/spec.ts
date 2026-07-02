import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'e2b',
  name: 'E2B',
  description:
    'Create, manage, and terminate secure cloud sandbox environments for AI-generated code execution using E2B.',
  metadata: {},
  config,
  auth
});
