import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'lever',
  name: 'Lever',
  description:
    'Lever is an applicant tracking system (ATS) and candidate relationship management (CRM) platform for sourcing, nurturing, interviewing, and hiring talent.',
  metadata: {},
  config,
  auth
});
