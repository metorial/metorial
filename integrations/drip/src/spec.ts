import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'drip',
  name: 'Drip',
  description: undefined,
  metadata: {},
  config,
  auth
});
