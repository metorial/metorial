import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'follow-up-boss',
  name: 'Follow Up Boss',
  description:
    'Real estate CRM platform for managing leads, contacts, deals, communications, and automated follow-ups.',
  metadata: {},
  config,
  auth
});
