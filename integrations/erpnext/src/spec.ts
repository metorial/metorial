import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'erpnext',
  name: 'ERPNext',
  description:
    'Manage enterprise business processes across ERPNext — accounting, inventory, sales, HR, manufacturing, and project management through a unified API.',
  metadata: {},
  config,
  auth
});
