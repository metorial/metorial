import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'smartsheet',
  name: 'Smartsheet',
  description:
    'Cloud-based work management and collaboration platform for organizing work into spreadsheet-like sheets with rows, columns, and cells. Provides project management, task tracking, file attachments, discussions, dashboards, reports, and sharing.',
  metadata: {},
  config,
  auth
});
