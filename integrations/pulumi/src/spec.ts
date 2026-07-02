import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'pulumi',
  name: 'Pulumi',
  description: undefined,
  metadata: {},
  config,
  auth
});
