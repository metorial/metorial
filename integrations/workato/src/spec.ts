import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'workato',
  name: 'Workato',
  description:
    'Cloud-based integration platform (iPaaS) for connecting applications, automating workflows, and managing APIs.',
  metadata: {},
  config,
  auth
});
