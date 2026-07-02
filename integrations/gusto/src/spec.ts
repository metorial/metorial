import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'gusto',
  name: 'Gusto',
  description:
    'Cloud-based payroll, benefits, and HR platform for U.S. businesses. Manage companies, employees, contractors, payroll processing, benefits administration, tax compliance, and related HR operations.',
  metadata: {},
  config,
  auth
});
