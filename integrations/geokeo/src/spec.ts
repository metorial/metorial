import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'geokeo',
  name: 'Geokeo',
  description: undefined,
  metadata: {},
  config,
  auth
});
