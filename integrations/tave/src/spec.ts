import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'tave',
  name: 'Tave',
  description:
    'CRM and studio management platform for photographers and creative professionals. Provides lead tracking, contact management, job management, invoicing, contracts, scheduling, and workflow automation.',
  metadata: {},
  config,
  auth
});
