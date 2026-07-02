import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'nango',
  name: 'Nango',
  description:
    'Open-source platform for building product integrations. Supports 700+ APIs with managed OAuth, API proxying, data syncing, and serverless integration functions.',
  metadata: {},
  config,
  auth
});
