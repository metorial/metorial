import { SlateSpecification } from '@slates/provider';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'pipedrive',
  name: 'Pipedrive',
  description:
    'Cloud-based CRM platform for managing sales pipelines, deals, contacts, activities, and products.',
  metadata: {},
  config,
  auth
});
