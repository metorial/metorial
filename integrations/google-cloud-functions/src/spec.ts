import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'google-cloud-functions',
  name: 'Google Cloud Functions',
  description:
    'Manage serverless Cloud Functions on Google Cloud. Create, deploy, update, and monitor functions triggered by HTTP requests or cloud events.',
  metadata: {},
  config,
  auth
});
