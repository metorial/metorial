import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'test-registry-publish',
  name: 'Test (registry publish)',
  description:
    'Internal test slate for checking registry publishing. Exposes one echo tool and needs no credentials.',
  metadata: {},
  config,
  auth
});
