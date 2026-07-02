import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'gigasheet',
  name: 'Gigasheet',
  description:
    'Cloud-based spreadsheet platform for handling large-scale datasets (CSV, JSON, log files) that exceed the limits of traditional spreadsheets.',
  metadata: {},
  config,
  auth
});
