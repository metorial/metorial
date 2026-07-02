import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'mistral-ai',
  name: 'Mistral Ai',
  description: undefined,
  metadata: {},
  config,
  auth
});
