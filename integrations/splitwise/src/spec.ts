import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'splitwise',
  name: 'Splitwise',
  description:
    'Splitwise is a service for splitting bills and shared expenses among friends and groups. It tracks who owes whom and provides tools for managing shared expenses, settling debts, and organizing costs.',
  metadata: {},
  config,
  auth
});
