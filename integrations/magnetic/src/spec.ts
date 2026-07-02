import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'magnetic',
  name: 'Magnetic',
  description:
    'All-in-one workflow management platform for professional services firms, combining CRM, project management, time tracking, and invoicing.',
  metadata: {},
  config,
  auth
});
