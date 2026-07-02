import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'bolna',
  name: 'Bolna',
  description: undefined,
  metadata: {},
  config,
  auth
});
