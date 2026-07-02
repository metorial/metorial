import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'stability-ai',
  name: 'Stability AI',
  description: undefined,
  metadata: {},
  config,
  auth
});
