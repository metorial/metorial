import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'firmao',
  name: 'Firmao',
  description:
    'Cloud-based CRM and ERP platform for small and medium businesses, providing customer management, project tracking, invoicing, warehouse management, and sales pipeline tools.',
  metadata: {},
  config,
  auth
});
