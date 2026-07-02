import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'benchmark-email',
  name: 'Benchmark Email',
  description:
    'Email marketing platform for creating campaigns, managing contacts, and tracking performance.',
  metadata: {},
  config,
  auth
});
