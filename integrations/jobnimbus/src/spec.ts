import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'jobnimbus',
  name: 'JobNimbus',
  description:
    'CRM and project management platform for the service/contracting industry, providing tools for managing contacts, jobs, tasks, estimates, invoices, and workflows.',
  metadata: {},
  config,
  auth
});
