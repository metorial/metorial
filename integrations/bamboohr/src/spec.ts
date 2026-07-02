import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'bamboohr',
  name: 'BambooHR',
  description:
    'Cloud-based HRIS for managing employees, time off, time tracking, benefits, goals, training, reports, applicant tracking, and company files.',
  metadata: {},
  config,
  auth
});
