import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'membervault',
  name: 'MemberVault',
  description:
    'List MemberVault products, grant or revoke product access, and delete user accounts.',
  metadata: {},
  config,
  auth
});
