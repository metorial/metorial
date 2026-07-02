import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'nusii-proposals',
  name: 'Nusii Proposals',
  description: undefined,
  metadata: {},
  config,
  auth
});
