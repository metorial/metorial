import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'booqable',
  name: 'Booqable',
  description:
    'Cloud-based rental software for managing equipment and product rentals, including inventory tracking, order management, customer management, billing, and payments.',
  metadata: {},
  config,
  auth
});
