import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'bitwarden',
  name: 'Bitwarden',
  description:
    'Open-source password manager and secrets management platform for organizations.',
  metadata: {},
  config,
  auth
});
