import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'jira-service-management',
  name: 'Jira Service Management',
  description:
    'Atlassian IT service management platform with customer portals, request queues, SLAs, knowledge bases, incident management, and on-call operations.',
  metadata: {},
  config,
  auth
});
