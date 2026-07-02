import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'neon',
  name: 'Neon',
  description:
    'Neon is a fully managed serverless PostgreSQL platform with database branching, autoscaling, and scale-to-zero compute.',
  metadata: {},
  config,
  auth
});
