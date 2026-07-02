import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'rippling',
  name: 'Rippling',
  description:
    'Unified workforce management platform for HR, IT, and Finance. Manage employees, company data, groups, leave requests, and onboarding through a single integration.',
  metadata: {},
  config,
  auth
});
