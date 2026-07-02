import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'aws-sqs',
  name: 'AWS SQS',
  description:
    'Amazon Simple Queue Service (SQS) integration for managing message queues, sending and receiving messages, and configuring queue settings.',
  metadata: {},
  config,
  auth
});
