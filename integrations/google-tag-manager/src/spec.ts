import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'google-tag-manager',
  name: 'Google Tag Manager',
  description:
    'Manage Google Tag Manager accounts, containers, workspaces, tags, triggers, variables, versions, and user permissions.',
  metadata: {},
  config,
  auth
});
