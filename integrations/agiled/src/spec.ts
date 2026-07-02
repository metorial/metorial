import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'agiled',
  name: 'Agiled',
  description:
    'Business management platform with built-in CRM, project management, HR, finances, and support ticketing. Manage contacts, deals, projects, tasks, invoices, contracts, employees, and more in one place.',
  metadata: {},
  config,
  auth
});
