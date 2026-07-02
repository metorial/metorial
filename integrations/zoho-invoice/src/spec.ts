import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'zoho-invoice',
  name: 'Zoho Invoice',
  description: undefined,
  metadata: {},
  config,
  auth
});
