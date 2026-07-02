import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'moneybird',
  name: 'Moneybird',
  description:
    'Cloud-based accounting and invoicing platform for small businesses and freelancers. Manage contacts, create and send invoices, track expenses, record payments, and handle time tracking.',
  metadata: {},
  config,
  auth
});
