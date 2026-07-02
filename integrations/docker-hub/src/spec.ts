import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'docker-hub',
  name: 'Docker Hub',
  description:
    'Cloud-based container image registry for storing, sharing, and distributing Docker container images. Manage repositories, tags, organizations, teams, webhooks, and access tokens.',
  metadata: {},
  config,
  auth
});
