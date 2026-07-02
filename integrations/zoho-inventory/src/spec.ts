import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'zoho-inventory',
  name: 'Zoho Inventory',
  description: undefined,
  metadata: {},
  config,
  auth
});
