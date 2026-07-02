import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'ashby',
  name: 'Ashby',
  description:
    'Applicant tracking system and recruiting platform for managing hiring pipelines, candidates, jobs, interviews, and offers.',
  metadata: {},
  config,
  auth
});
