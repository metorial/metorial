import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'circleci',
  name: 'Circle CI',
  description: undefined,
  metadata: {},
  config,
  auth
});
