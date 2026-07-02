import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'split',
  name: 'Split',
  description:
    'Feature flag management and experimentation platform. Manage feature flags, segments, environments, users, and groups via the Split Admin API.',
  metadata: {},
  config,
  auth
});
