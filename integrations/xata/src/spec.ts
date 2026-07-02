import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'xata',
  name: 'Xata',
  description:
    'Serverless PostgreSQL database platform with copy-on-write branching, zero-downtime migrations, full-text search, vector search, and AI-powered Q&A.',
  metadata: {},
  config,
  auth
});
