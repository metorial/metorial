import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'stability-ai',
  name: 'Stability Ai',
  description: undefined,
  metadata: {},
  config,
  auth
});
