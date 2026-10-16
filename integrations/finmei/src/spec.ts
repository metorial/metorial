import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'finmei',
  name: 'Finmei',
  description:
    'Manage business invoices, expense receipts, payments, customers, and products. Retrieve business details and prepare invoice PDFs and original receipts for download.',
  metadata: {},
  config,
  auth
});
