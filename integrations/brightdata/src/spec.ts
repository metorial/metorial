import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'bright-data',
  name: 'Bright Data',
  description: undefined,
  metadata: {},
  config,
  auth
});
