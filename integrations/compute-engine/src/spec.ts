import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'compute-engine',
  name: 'Google Compute Engine',
  description:
    'Connect a Google Cloud project to the Compute Engine API for virtual machine and infrastructure workflows.',
  metadata: {},
  config,
  auth
});
