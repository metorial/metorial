import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'emailoctopus',
  name: 'EmailOctopus',
  description:
    'Email marketing platform for managing contact lists and fields, reviewing campaign reports, and starting configured automations.',
  metadata: {},
  config,
  auth
});
