import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'ynab',
  name: 'YNAB',
  description:
    'YNAB (You Need A Budget) is a personal budgeting application. This integration provides access to budgets, accounts, transactions, categories, payees, and scheduled transactions.',
  metadata: {},
  config,
  auth
});
