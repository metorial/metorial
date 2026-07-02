import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'dromo',
  name: 'Dromo',
  description:
    'Data import platform for accepting and processing CSV, Excel, TSV, and other spreadsheet file uploads.',
  metadata: {},
  config,
  auth
});
