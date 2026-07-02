import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'test-http',
  name: 'Test (HTTP)',
  description:
    'Internal test slate that sends arbitrary HTTP requests through the built-in slates axios client. Useful for exercising network traces, retries, and response handling.',
  metadata: {},
  config,
  auth
});
