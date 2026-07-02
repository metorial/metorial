import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'square',
  name: 'Square',
  description:
    'Square is a financial services and commerce platform for payment processing, order management, customer relationship management, inventory tracking, and more.',
  metadata: {},
  config,
  auth
});
