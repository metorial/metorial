import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'clientary',
  name: 'Clientary',
  description:
    'Online invoicing, time tracking, and project management platform for small businesses and professional services firms.',
  metadata: {},
  config,
  auth
});
