import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'twilio-flex',
  name: 'Twilio Flex',
  description: undefined,
  metadata: {},
  config,
  auth
});
