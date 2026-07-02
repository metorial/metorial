import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'item',
  name: 'Item',
  description:
    'Manage people, companies, and custom objects in item. Query shared views, inspect schema, batch upsert records, list users, and trigger webhook-based skills.',
  metadata: {},
  config,
  auth
});
