import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'shippo',
  name: 'Shippo',
  description:
    'Multi-carrier shipping API for comparing rates, creating labels, tracking packages, and managing shipments across 85+ carriers.',
  metadata: {},
  config,
  auth
});
