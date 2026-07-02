import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'felt',
  name: 'Felt',
  description:
    'Collaborative web-based GIS platform for creating, sharing, and managing interactive maps.',
  metadata: {},
  config,
  auth
});
