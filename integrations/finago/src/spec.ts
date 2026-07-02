import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'finago',
  name: 'Finago (24SevenOffice)',
  description:
    'Manage Finago Office accounting, CRM, products, sales orders, ledger reporting, transactions, and accounting documents through the 24SevenOffice REST API.',
  metadata: {},
  config,
  auth
});
