import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'memberstack',
  name: 'Memberstack',
  description:
    'Manage Memberstack members, free plans, token verification, and data table records.',
  metadata: {},
  config,
  auth
});
