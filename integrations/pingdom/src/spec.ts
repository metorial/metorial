import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'pingdom',
  name: 'Pingdom',
  description: undefined,
  metadata: {},
  config,
  auth
});
