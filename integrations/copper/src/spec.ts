import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'copper',
  name: 'Copper',
  description:
    'Copper is a CRM platform built for Google Workspace users, designed for sales, marketing, and support teams to manage contacts, companies, leads, opportunities, tasks, projects, and activities.',
  metadata: {},
  config,
  auth
});
