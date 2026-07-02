import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'test-triggers',
  name: 'Test Triggers',
  description:
    'Internal test slate with polling and webhook triggers for callback and trigger smoke testing.',
  metadata: {},
  config,
  auth
});
