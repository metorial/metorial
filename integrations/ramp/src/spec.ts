import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'ramp',
  name: 'Ramp',
  description:
    'Corporate spend management platform providing corporate cards, bill payments, reimbursements, and accounting automation.',
  metadata: {},
  config,
  auth
});
