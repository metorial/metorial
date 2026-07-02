import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'looker',
  name: 'Looker',
  description: undefined,
  metadata: {},
  config,
  auth
});
