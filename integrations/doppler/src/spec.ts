import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'doppler',
  name: 'Doppler',
  description:
    'Centralized secrets management platform for storing, managing, and syncing environment variables and secrets across applications, environments, and infrastructure.',
  metadata: {},
  config,
  auth
});
