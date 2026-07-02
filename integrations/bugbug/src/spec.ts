import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'bugbug',
  name: 'BugBug',
  description:
    'Codeless test automation tool for creating, running, and managing end-to-end web application tests in the cloud.',
  metadata: {},
  config,
  auth
});
