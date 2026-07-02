import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'capsule-crm',
  name: 'Capsule Crm',
  description: undefined,
  metadata: {},
  config,
  auth
});
