import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'tooljet',
  name: 'ToolJet',
  description:
    'Use the Enterprise self-hosted external API to manage users, workspaces and applications, and access separately configured workflow webhooks.',
  metadata: {},
  config,
  auth
});
