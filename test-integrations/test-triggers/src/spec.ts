import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { configuration } from './config';

export let spec = SlateSpecification.create({
  key: 'test-triggers',
  name: 'Test Triggers',
  description:
    'Internal test slate with polling and callback controls plus a comprehensive core, canonical-preset, and scoped provider-boundary webhook verification matrix.',
  metadata: {},
  config: configuration,
  auth
});
