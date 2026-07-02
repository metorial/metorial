import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'repairshopr',
  name: 'RepairShopr',
  description:
    'Business management platform for service and repair shops with ticketing, invoicing, inventory, and customer management.',
  metadata: {},
  config,
  auth
});
