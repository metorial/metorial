import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'gusto',
  name: 'Gusto',
  description:
    'Discover the authorized Gusto company, read employees, contractors and payrolls, and manage documented benefits, locations, departments and compensation. Payroll processing, contractor payment writes, job management and form metadata require separately approved Embedded Payroll capabilities.',
  metadata: {},
  config,
  auth
});
