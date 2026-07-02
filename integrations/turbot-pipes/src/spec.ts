import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'turbot-pipes',
  name: 'Turbot Pipes',
  description:
    'Cloud intelligence, automation, and security platform for DevOps built on Steampipe, Powerpipe, and Flowpipe. Manage workspaces, connections, organizations, execute SQL queries, and automate pipelines.',
  metadata: {},
  config,
  auth
});
