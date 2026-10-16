import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'npm',
  name: 'npm',
  description:
    'Search npm packages, inspect metadata, downloads and security advisories, and manage distribution tags, deprecations, tokens and trusted publishers.',
  metadata: {},
  config,
  auth
});
