import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'test-no-auth',
  name: 'Test (no auth)',
  description:
    'Internal test slate with no authentication. Exposes small calculator tools for integration and smoke testing.',
  metadata: {},
  config,
  auth
});
