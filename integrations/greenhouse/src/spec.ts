import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'greenhouse',
  name: 'Greenhouse',
  description:
    'Applicant tracking system (ATS) for managing recruitment workflows including candidates, applications, jobs, offers, interviews, and organizational data.',
  metadata: {},
  config,
  auth
});
