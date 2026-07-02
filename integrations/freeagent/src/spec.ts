import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'freeagent',
  name: 'Freeagent',
  description: undefined,
  metadata: {},
  config,
  auth
});
