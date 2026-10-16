import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'plisio',
  name: 'Plisio',
  description:
    'Create and retrieve cryptocurrency invoices, send withdrawals, inspect balances and fees, identify your shop, and manage permanent deposit addresses.',
  metadata: {},
  config,
  auth
});
