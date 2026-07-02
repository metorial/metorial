import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'sparebank-1-regnskap',
  name: 'SpareBank 1 Regnskap',
  description:
    'Query SpareBank 1 Regnskap accounting data through the Unimicro Platform API, including companies, customers, suppliers, invoices, products, accounts, projects, reports, and file downloads.',
  metadata: {},
  config,
  auth
});
