import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'mx-technologies',
  name: 'MX Technologies',
  description:
    'Open finance platform connecting applications to thousands of financial institutions. Aggregate accounts, verify ownership, check balances, retrieve transactions, and enhance financial data.',
  metadata: {},
  config,
  auth
});
