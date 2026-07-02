import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'emailoctopus',
  name: 'EmailOctopus',
  description:
    'Email marketing platform for managing contact lists, sending campaigns, and running automated email sequences.',
  metadata: {},
  config,
  auth
});
