import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'sendloop',
  name: 'Sendloop',
  description:
    'Manage subscriber lists, import contacts, prepare and send email campaigns, and retrieve performance reports.',
  metadata: {},
  config,
  auth
});
