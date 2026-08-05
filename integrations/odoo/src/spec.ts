import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'odoo',
  name: 'Odoo',
  description:
    'Connect to Odoo business data and workflows across CRM, Sales, Accounting, Purchase, Inventory, Projects, and other installed modules. Supports Odoo 19+ JSON-2 and legacy JSON-RPC for model discovery, record operations, file downloads, validated workflow actions, and change notifications.',
  metadata: {},
  config,
  auth
});
