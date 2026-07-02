import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'gender-api',
  name: 'Gender API',
  description: undefined,
  metadata: {},
  config,
  auth
});
