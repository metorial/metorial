import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'gitea',
  name: 'Gitea',
  description:
    'Manage repositories, files, issues, pull requests, releases, wikis, organizations, and teams on a Gitea instance.',
  metadata: {},
  config,
  auth
});
