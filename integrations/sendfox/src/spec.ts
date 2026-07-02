import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'sendfox',
  name: 'Sendfox',
  description: undefined,
  metadata: {},
  config,
  auth
});
