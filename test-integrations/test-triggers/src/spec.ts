import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'test-triggers',
  name: 'Test Triggers',
  description:
    'Internal test slate with polling and legacy callback controls plus a comprehensive core, canonical-preset, and scoped provider-boundary webhook verification matrix.',
  metadata: {},
  config,
  auth
});
