import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'zoho-crm',
  name: 'Zoho CRM',
  description:
    'Zoho CRM integration for managing leads, contacts, accounts, deals, tasks, and other CRM modules.',
  metadata: {},
  config,
  auth
});
