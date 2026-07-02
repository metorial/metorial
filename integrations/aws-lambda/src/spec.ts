import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'aws-lambda',
  name: 'AWS Lambda',
  description:
    'Serverless compute service for running code in response to events without managing servers.',
  metadata: {},
  config,
  auth
});
