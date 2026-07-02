import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'baserow',
  name: 'Baserow',
  description:
    'Open-source no-code database platform with spreadsheet-like interfaces and relational database capabilities. Manage workspaces, databases, tables, fields, rows, views, and webhooks via REST API.',
  metadata: {},
  config,
  auth
});
