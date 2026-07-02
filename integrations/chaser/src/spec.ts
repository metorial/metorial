import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'chaser',
  name: 'Chaser',
  description:
    'Accounts receivable automation platform for chasing late payments, managing credit control, and improving cash flow.',
  metadata: {},
  config,
  auth
});
