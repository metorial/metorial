import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'google-admin',
  name: 'Google Admin',
  description:
    'Manage Google Workspace organizations through the Admin SDK. Provides capabilities for managing users, groups, organizational units, devices, roles, domains, licenses, audit logs, and security alerts.',
  metadata: {},
  config,
  auth
});
