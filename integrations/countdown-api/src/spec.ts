import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'countdown-api',
  name: 'Countdown API',
  description: undefined,
  metadata: {},
  config,
  auth
});
