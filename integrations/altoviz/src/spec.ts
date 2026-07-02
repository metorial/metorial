import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'altoviz',
  name: 'Altoviz',
  description:
    'Cloud-based invoicing and accounting platform for small businesses and freelancers. Manage customers, contacts, products, sales invoices, quotes, credits, suppliers, and receipts.',
  metadata: {},
  config,
  auth
});
