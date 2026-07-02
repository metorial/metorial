import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'forcemanager',
  name: 'ForceManager',
  description:
    'Mobile-first CRM platform (Sage Sales Management) for field sales teams. Manage accounts, contacts, opportunities, activities, sales orders, products, and calendar events.',
  metadata: {},
  config,
  auth
});
