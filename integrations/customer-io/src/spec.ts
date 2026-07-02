import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'customerio',
  name: 'Customer.io',
  description:
    'Messaging and marketing automation platform for targeted email, SMS, push, and in-app messages based on customer behavior and attributes.',
  metadata: {},
  config,
  auth
});
