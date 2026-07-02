import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'duo-security',
  name: 'Duo Security',
  description:
    'Cisco Duo Security multi-factor authentication and access security platform. Manage users, groups, phones, admins, integrations, and retrieve authentication logs.',
  metadata: {},
  config,
  auth
});
