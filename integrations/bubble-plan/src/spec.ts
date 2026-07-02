import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'bubble-plan',
  name: 'Bubble Plan',
  description:
    'Project management and collaboration platform for managing projects, tasks, time tracking, file sharing, and team collaboration.',
  metadata: {},
  config,
  auth
});
