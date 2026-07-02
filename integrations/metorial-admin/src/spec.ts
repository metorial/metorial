import { SlateSpecification } from '@slates/provider';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'metorial-admin',
  name: 'Metorial Admin',
  description:
    'Inspect and call authorized Metorial dashboard instance API endpoints through a controlled dynamic wrapper.',
  metadata: {},
  config,
  auth
});
