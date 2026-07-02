import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'unimicro',
  name: 'UniMicro',
  description:
    'Norwegian cloud accounting and ERP platform for company context, customers, suppliers, products, invoices, accounts, journal entries, projects, financial reports, and file downloads.',
  metadata: {},
  config,
  auth
});
