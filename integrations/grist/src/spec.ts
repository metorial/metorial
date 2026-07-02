import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'grist',
  name: 'Grist',
  description:
    'Open-source relational spreadsheet-database hybrid. Manage organizations, workspaces, documents, tables, columns, records, and webhooks via REST API.',
  metadata: {},
  config,
  auth
});
