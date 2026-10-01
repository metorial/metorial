import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'zoho',
  name: 'Zoho',
  description:
    'Manage Zoho CRM, Bigin, Books, Inventory, Invoice, Desk, Mail, People, and Projects from one connection.',
  metadata: {},
  config,
  auth
});
