import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'tripletex',
  name: 'Tripletex',
  description:
    'Access Tripletex accounting and ERP data, including customers, suppliers, contacts, employees, reference data, products, invoices, vouchers, postings, projects, documents, PDFs, and webhook subscriptions.',
  metadata: {},
  config,
  auth
});
