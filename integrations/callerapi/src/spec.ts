import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'callerapi',
  name: 'Callerapi',
  description: undefined,
  metadata: {},
  config,
  auth
});
