import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'ifs-applications',
  name: 'IFS Cloud / IFS Applications',
  description:
    'Discover tenant-specific IFS Cloud projection APIs, export OpenAPI schemas, and query bounded OData records from enabled projections.',
  metadata: {},
  config,
  auth
});
