import { SlateSpecification } from '@slates/provider';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'xero',
  name: 'Xero',
  description: undefined,
  metadata: {},
  config,
  auth
});
