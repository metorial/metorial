import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'ragic',
  name: 'Ragic',
  description:
    'Online no-code database builder for creating business applications with a spreadsheet-like interface. Manage records, files, comments, and workflows through the Ragic REST API.',
  metadata: {},
  config,
  auth
});
