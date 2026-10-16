import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'cincopa',
  name: 'Cincopa',
  description:
    'Manage Cincopa media assets, galleries, uploads, portal settings, and live streams.',
  metadata: {},
  config,
  auth
});
