import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'wachete',
  name: 'Wachete',
  description: undefined,
  metadata: {},
  config,
  auth
});
