import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'moco',
  name: 'Moco',
  description: undefined,
  metadata: {},
  config,
  auth
});
