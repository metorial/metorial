import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'api-labz',
  name: 'API Labz',
  description: undefined,
  metadata: {},
  config,
  auth
});
