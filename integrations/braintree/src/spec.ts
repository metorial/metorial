import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'braintree',
  name: 'Braintree',
  description: undefined,
  metadata: {},
  config,
  auth
});
