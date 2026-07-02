import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'highergov',
  name: 'Highergov',
  description: undefined,
  metadata: {},
  config,
  auth
});
