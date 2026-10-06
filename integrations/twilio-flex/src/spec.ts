import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'twilio-flex',
  name: 'Twilio Flex',
  description:
    'Manage Flex interactions, Conversations and TaskRouter resources in an authorized US1 account.',
  metadata: {},
  config,
  auth
});
