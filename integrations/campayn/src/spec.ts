import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'campayn',
  name: 'Campayn',
  description:
    'Manage email marketing contacts and subscribers, inspect email campaigns and reports, and retrieve web sign-up forms.',
  metadata: {},
  config,
  auth
});
