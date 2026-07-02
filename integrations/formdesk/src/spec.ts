import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'formdesk',
  name: 'Formdesk',
  description:
    'Online form builder for creating registration forms, order forms, surveys, and applications with API access for managing forms, submissions, visitors, and files.',
  metadata: {},
  config,
  auth
});
