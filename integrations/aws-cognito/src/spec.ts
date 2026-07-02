import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'aws-cognito',
  name: 'AWS Cognito',
  description:
    'Amazon Cognito identity platform for managing user pools, identity federation, app clients, identity pools, and authentication workflows.',
  metadata: {},
  config,
  auth
});
