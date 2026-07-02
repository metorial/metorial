import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'wrike',
  name: 'Wrike',
  description:
    'Cloud-based work management and project management platform for tasks, projects, folders, time tracking, approvals, and team collaboration.',
  metadata: {},
  config,
  auth
});
