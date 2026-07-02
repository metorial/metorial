import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'aws-dynamodb',
  name: 'AWS DynamoDB',
  description:
    'Amazon DynamoDB is a fully managed NoSQL database service that supports key-value and document data models with single-digit millisecond performance at any scale.',
  metadata: {},
  config,
  auth
});
