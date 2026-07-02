import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'workable',
  name: 'Workable',
  description: undefined,
  metadata: {},
  config,
  auth
});
