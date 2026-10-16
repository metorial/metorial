import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'doppler-marketing-automation',
  name: 'Doppler Marketing Automation',
  description:
    'Manage Doppler email campaigns, content and recipients, subscriber lists, custom fields, asynchronous imports, and campaign performance reports.',
  metadata: {},
  config,
  auth
});
