import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'salesflare',
  name: 'Salesflare',
  description:
    'Discover and maintain CRM accounts, contacts, opportunities, tasks and timeline notes, with pipeline, team and custom-field metadata.',
  metadata: {},
  config,
  auth
});
