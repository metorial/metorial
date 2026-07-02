import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'storeganise',
  name: 'Storeganise',
  description:
    'Cloud-based management platform for self-storage, valet storage, and mobile storage businesses. Manage bookings, payments, access control, and customer communication from a single platform.',
  metadata: {},
  config,
  auth
});
