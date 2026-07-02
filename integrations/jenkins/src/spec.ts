import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'jenkins',
  name: 'Jenkins',
  description: undefined,
  metadata: {},
  config,
  auth
});
