import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'formbricks',
  name: 'Formbricks',
  description:
    'Open-source experience management and survey platform. Manage surveys and responses, read contacts, define action classes, and discover workspace context and contact attribute keys through the Management API v1.',
  metadata: {},
  config,
  auth
});
