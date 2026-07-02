import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'plisio',
  name: 'Plisio',
  description:
    'Cryptocurrency payment gateway for creating invoices, processing withdrawals, managing balances, and accepting payments in 30+ cryptocurrencies.',
  metadata: {},
  config,
  auth
});
