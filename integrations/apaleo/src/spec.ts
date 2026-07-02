import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'apaleo',
  name: 'Apaleo',
  description:
    'Cloud-based, API-first property management system (PMS) for hotels and serviced apartments. Manage reservations, inventory, rates, guest profiles, folios, invoices, and payments.',
  metadata: {},
  config,
  auth
});
