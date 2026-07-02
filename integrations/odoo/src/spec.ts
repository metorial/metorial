import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'odoo',
  name: 'Odoo',
  description:
    'Open-source ERP platform offering CRM, Sales, Accounting, Inventory, HR, Manufacturing, eCommerce, Project Management, and more. Provides full CRUD operations on any model through a unified JSON-RPC API.',
  metadata: {},
  config,
  auth
});
