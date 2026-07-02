import { SlateSpecification } from '@slates/provider';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'quickbooks',
  name: 'QuickBooks',
  description:
    'QuickBooks Online accounting software integration for managing invoices, customers, vendors, payments, bills, expenses, and financial reports.',
  metadata: {},
  config,
  auth
});
