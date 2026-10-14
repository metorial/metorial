import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'capsule-crm',
  name: 'Capsule CRM',
  description:
    'Manage contacts, sales opportunities, projects, tasks, notes, and tags in Capsule CRM.',
  metadata: {},
  config,
  auth
});
