import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'lastpass',
  name: 'LastPass',
  description:
    'LastPass Enterprise administrative user provisioning, group membership, shared-folder permissions, and audit reporting through the company-ID and provisioning-hash API. No vault-content access.',
  metadata: {},
  config,
  auth
});
