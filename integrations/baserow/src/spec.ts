import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'baserow',
  name: 'Baserow',
  description:
    'Open-source no-code database platform with spreadsheet-like interfaces and relational database capabilities. Discover databases and tables, manage rows, fields, tables, and views, and upload files via the REST API.',
  metadata: {},
  config,
  auth
});
