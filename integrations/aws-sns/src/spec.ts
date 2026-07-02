import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'aws-sns',
  name: 'AWS SNS',
  description:
    'Amazon Simple Notification Service (SNS) is a fully managed pub/sub messaging service for application-to-application and application-to-person message delivery across topics, SMS, email, and push notifications.',
  metadata: {},
  config,
  auth
});
