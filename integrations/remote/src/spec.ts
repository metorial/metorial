import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'remote',
  name: 'Remote',
  description:
    'Global HR platform for hiring, managing, and paying employees and contractors worldwide. Provides Employer of Record (EOR) services, global payroll, contractor management, time off, expenses, incentives, and compliance handling.',
  metadata: {},
  config,
  auth
});
