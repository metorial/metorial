import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'test-errors',
  name: 'Test (errors)',
  description:
    'Internal test slate for exercising error paths. Provides tools that deliberately throw a caller-specified error for integration and smoke testing.',
  metadata: {},
  config,
  auth
});
