import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'streamtime',
  name: 'Streamtime',
  description:
    'Cloud-based project management platform for creative businesses and agencies, providing job planning, time tracking, quoting, invoicing, and profitability reporting.',
  metadata: {},
  config,
  auth
});
