import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'brex',
  name: 'Brex',
  description:
    'Brex is a unified spend platform offering corporate cards, expense management, reimbursements, travel, and bill pay. Manage users, cards, budgets, expenses, payments, vendors, and transactions through the Brex API.',
  metadata: {},
  config,
  auth
});
