import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'test-triggers',
  name: 'Test Triggers',
  description:
    'Internal test slate that exercises every trigger-group type: polling, auto-registered webhooks, and manual webhook registration, including routing matchers and token auth.',
  metadata: {},
  config,
  auth
});
