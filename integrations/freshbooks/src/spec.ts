import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'freshbooks',
  name: 'FreshBooks',
  description:
    'Cloud-based accounting software for small businesses and freelancers. Provides invoicing, expense tracking, time tracking, payments, estimates, and financial reporting.',
  metadata: {},
  config,
  auth
});
