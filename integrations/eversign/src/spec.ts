import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'eversign',
  name: 'Eversign',
  description: undefined,
  metadata: {},
  config,
  auth
});
