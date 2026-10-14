import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'ascora',
  name: 'Ascora',
  description:
    'Search customers and jobs, submit enquiries, and synchronise invoices and payments with accounting systems for trade businesses.',
  metadata: {},
  config,
  auth
});
