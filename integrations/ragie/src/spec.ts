import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'ragie',
  name: 'Ragie',
  description: undefined,
  metadata: {},
  config,
  auth
});
