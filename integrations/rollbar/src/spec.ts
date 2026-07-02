import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'rollbar',
  name: 'Rollbar',
  description: 'Real-time error tracking and monitoring platform for software applications.',
  metadata: {},
  config,
  auth
});
