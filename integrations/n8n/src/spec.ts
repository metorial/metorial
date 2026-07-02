import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'n8n',
  name: 'n8n',
  description:
    'Workflow automation platform for connecting applications and building automated workflows. Manage workflows, executions, credentials, users, tags, variables, projects, and more.',
  metadata: {},
  config,
  auth
});
