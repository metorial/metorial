import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'hootsuite',
  name: 'Hootsuite',
  description:
    'Manage Hootsuite posts, connected social accounts, media, organizations, teams and members.',
  metadata: {},
  config,
  auth
});
