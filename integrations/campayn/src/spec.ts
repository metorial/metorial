import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'campayn',
  name: 'Campayn',
  description:
    'Create, send, and track email marketing campaigns and newsletters. Manage contact lists, subscribers, reports, and web sign-up forms.',
  metadata: {},
  config,
  auth
});
