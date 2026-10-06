import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'duo-security',
  name: 'Duo Security',
  description:
    'Cisco Duo Security multi-factor authentication and access security platform. Manage users, groups, phones and administrators, discover protected applications, and read account context and logs.',
  metadata: {},
  config,
  auth
});
