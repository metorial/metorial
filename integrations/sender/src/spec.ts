import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'sender',
  name: 'Sender',
  description:
    'Manage subscribers and groups, discover fields and workflows, create and inspect email campaigns, send transactional emails, and retrieve campaign engagement.',
  metadata: {},
  config,
  auth
});
