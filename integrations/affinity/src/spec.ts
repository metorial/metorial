import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'affinity',
  name: 'Affinity',
  description:
    'Relationship intelligence CRM for managing contacts, organizations, deal pipelines, and interactions.',
  metadata: {},
  config,
  auth
});
