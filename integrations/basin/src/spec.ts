import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'basin',
  name: 'Basin',
  description:
    'No-code form backend for handling form submissions, spam filtering, file uploads, webhooks, and integrations.',
  metadata: {},
  config,
  auth
});
