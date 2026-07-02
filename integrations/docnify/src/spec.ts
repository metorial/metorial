import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'docnify',
  name: 'Docnify',
  description:
    'Cloud-based platform for creating, sending, and managing electronic document signatures. Helps SMBs collect information, automate data workflows, and sign on various devices.',
  metadata: {},
  config,
  auth
});
