import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'stern-financial-data',
  name: 'Stern Financial Data',
  description:
    'Query public NYU Stern financial datasets including country equity risk premiums and industry betas.',
  metadata: {},
  config,
  auth
});
