import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'zoho-crm',
  name: 'Zoho CRM',
  description:
    'Manage leads, contacts, accounts, deals, tasks, and other CRM modules across supported Zoho data centers.',
  metadata: {},
  config,
  auth
});
