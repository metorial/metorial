import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'northflank',
  name: 'Northflank',
  description:
    'Full-stack cloud platform for building, deploying, and scaling applications, jobs, and databases.',
  metadata: {},
  config,
  auth
});
