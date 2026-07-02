import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'google-sheets',
  name: 'Google Sheets',
  description:
    'Cloud-based spreadsheet application that is part of Google Workspace. Create, read, update, and manage spreadsheets with support for cell formatting, charts, pivot tables, data validation, and more.',
  metadata: {},
  config,
  auth
});
