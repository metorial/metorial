import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'rosette-text-analytics',
  name: 'Rosette Text Analytics',
  description: undefined,
  metadata: {},
  config,
  auth
});
