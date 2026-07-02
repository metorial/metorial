import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'ascora',
  name: 'Ascora',
  description:
    'Cloud-based field service management and job management platform for trade businesses. Manage enquiries, customers, invoices, and payments.',
  metadata: {},
  config,
  auth
});
