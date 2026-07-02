import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'token-metrics',
  name: 'Token Metrics',
  description: undefined,
  metadata: {},
  config,
  auth
});
