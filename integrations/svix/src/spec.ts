import { SlateSpecification } from '@slates/provider';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'svix',
  name: 'Svix',
  description:
    'Webhooks-as-a-service platform for sending, managing, and receiving webhooks reliably. Handles retries, scaling, security, and observability.',
  metadata: {},
  config,
  auth
});
