import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'salesforce',
  name: 'Salesforce',
  description:
    'Cloud-based CRM platform providing sales, service, marketing, and commerce tools with comprehensive REST API access for managing records, running queries, bulk operations, and analytics.',
  metadata: {},
  config,
  auth
});
