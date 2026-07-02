import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'echtpost',
  name: 'Echtpost',
  description:
    'Send real physical postcards programmatically through the German EchtPost platform. Manage contacts, templates, and schedule postcard deliveries.',
  metadata: {},
  config,
  auth
});
