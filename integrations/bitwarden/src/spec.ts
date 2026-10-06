import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'bitwarden',
  name: 'Bitwarden',
  description:
    'Manage organization members, groups, collection permissions, policies and event logs using the Bitwarden organization Public API.',
  metadata: {},
  config,
  auth
});
