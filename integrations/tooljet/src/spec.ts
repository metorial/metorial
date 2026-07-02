import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'tooljet',
  name: 'ToolJet',
  description:
    'Open-source low-code platform for building internal tools. Manage users, workspaces, and applications programmatically.',
  metadata: {},
  config,
  auth
});
