import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'membervault',
  name: 'Membervault',
  description:
    'Manage users, products, and engagement tracking for online courses, memberships, and digital products on MemberVault.',
  metadata: {},
  config,
  auth
});
