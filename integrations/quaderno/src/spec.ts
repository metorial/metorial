import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'quaderno',
  name: 'Quaderno',
  description:
    'Manage Quaderno account records, request configured tax calculations and validation, and download reports.',
  metadata: {},
  config,
  auth
});
