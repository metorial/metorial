import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'poweroffice',
  name: 'PowerOffice',
  description:
    'Norwegian cloud accounting and ERP platform for customers, suppliers, products, sales orders, invoices, ledger reporting, trial balance, and voucher documentation.',
  metadata: {},
  config,
  auth
});
