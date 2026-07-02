import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'fiken',
  name: 'Fiken',
  description:
    'Access Fiken accounting data including companies, contacts, invoices, invoice drafts, products, projects, purchases, sales, accounts, and account balances.',
  metadata: {},
  config,
  auth
});
