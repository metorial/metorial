import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'tapfiliate',
  name: 'Tapfiliate',
  description:
    'Cloud-based affiliate tracking platform for creating, managing, and optimizing affiliate marketing programs with conversion tracking, commission management, and multi-level marketing support.',
  metadata: {},
  config,
  auth
});
