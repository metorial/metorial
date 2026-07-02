import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'visma-net',
  name: 'Visma Net',
  description:
    'Cloud ERP integration for Visma Net using the official Visma.net ERP API. Read customers, suppliers, accounts, invoices, projects, inventory, sales orders, attachments, and background operations.',
  metadata: {},
  config,
  auth
});
