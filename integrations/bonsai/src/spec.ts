import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'bonsai',
  name: 'Bonsai',
  description:
    'Business management platform for freelancers, agencies, and professional service companies. Provides CRM, proposals, contracts, invoicing, project management, time tracking, deals pipeline, scheduling, forms, and expense tracking.',
  metadata: {},
  config,
  auth
});
