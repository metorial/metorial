import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'teamcamp',
  name: 'Teamcamp',
  description:
    'Project management platform for managing projects, tasks, team collaboration, time tracking, invoicing, and client portals.',
  metadata: {},
  config,
  auth
});
