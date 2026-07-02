import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'google-sheets',
  name: 'Google Sheets',
  description:
    'Cloud-based spreadsheet application for creating, editing, and collaborating on spreadsheets.',
  metadata: {},
  config,
  auth
});
