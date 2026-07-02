import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'salesmate',
  name: 'Salesmate',
  description:
    'CRM platform for managing sales pipelines, contacts, companies, deals, activities, and customer support tickets.',
  metadata: {},
  config,
  auth
});
