import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'espocrm',
  name: 'EspoCRM',
  description:
    'Open-source CRM platform for managing contacts, accounts, leads, opportunities, cases, activities, and email. Self-hosted with a comprehensive REST API.',
  metadata: {},
  config,
  auth
});
