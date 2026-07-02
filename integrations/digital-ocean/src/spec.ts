import { SlateSpecification } from '@slates/provider';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'digitalocean',
  name: 'Digital Ocean',
  description: undefined,
  metadata: {},
  config,
  auth
});
