import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'acuity-scheduling',
  name: 'Acuity Scheduling',
  description:
    'Online appointment scheduling platform for managing bookings, availability, client intake, and payments.',
  metadata: {},
  config,
  auth
});
