import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'lastpass',
  name: 'LastPass',
  description:
    'Enterprise password manager providing secure credential storage, user provisioning, group management, shared folder controls, and audit event reporting through the LastPass Provisioning API.',
  metadata: {},
  config,
  auth
});
