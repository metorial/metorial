import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'helloleads',
  name: 'HelloLeads',
  description:
    'Sales CRM and lead management software for capturing, tracking, and managing leads.',
  metadata: {},
  config,
  auth
});
