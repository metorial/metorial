import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'bigcommerce',
  name: 'Big Commerce',
  description: undefined,
  metadata: {},
  config,
  auth
});
