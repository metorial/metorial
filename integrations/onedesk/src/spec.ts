import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'onedesk',
  name: 'OneDesk',
  description:
    'A combined help desk and project management platform. Create and manage tickets, tasks, projects, timesheets, invoices, users, and conversations.',
  metadata: {},
  config,
  auth
});
