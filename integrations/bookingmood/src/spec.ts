import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'bookingmood',
  name: 'Bookingmood',
  description:
    'Commission-free booking platform for vacation rental owners and property managers.',
  metadata: {},
  config,
  auth
});
