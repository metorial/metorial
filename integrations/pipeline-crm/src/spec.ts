import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'pipeline-crm',
  name: 'Pipeline CRM',
  description:
    'Sales CRM platform for managing deals, contacts, companies, activities, and notes. Provides deal tracking, contact management, and sales forecasting capabilities.',
  metadata: {},
  config,
  auth
});
