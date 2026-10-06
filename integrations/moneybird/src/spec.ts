import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'moneybird',
  name: 'Moneybird',
  description:
    'Cloud-based accounting and invoicing platform for small businesses and freelancers. Manage contacts, create and send invoices, download invoices, reconcile bank transactions, and manage time entries and projects.',
  metadata: {},
  config,
  auth
});
