import { SlateSpecification } from '@slates/provider';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'bitbucket',
  name: 'Bitbucket',
  description:
    'Atlassian Bitbucket Cloud integration for managing Git repositories, pull requests, CI/CD pipelines, workspaces, and more.',
  metadata: {},
  config,
  auth
});
