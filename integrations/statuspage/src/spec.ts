import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'statuspage',
  name: 'Statuspage',
  description:
    'Atlassian Statuspage integration for managing status pages, components, incidents, subscribers, and metrics.',
  metadata: {},
  config,
  auth
});
