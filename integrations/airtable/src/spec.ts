import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'airtable',
  name: 'Airtable',
  description:
    'Airtable is a low-code platform combining spreadsheet and database functionality, allowing users to create relational databases with a visual interface.',
  metadata: {},
  config,
  auth
});
