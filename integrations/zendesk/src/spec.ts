import { SlateSpecification } from '@slates/provider';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'zendesk',
  name: 'Zendesk',
  description: 'Customer service platform for ticketing, help center, and user management',
  metadata: {},
  config,
  auth
});
