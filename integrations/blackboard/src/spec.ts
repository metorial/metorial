import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'blackboard',
  name: 'Blackboard',
  description:
    'Manage courses, users, enrollments, grades, and content in Blackboard Learn LMS.',
  metadata: {},
  config,
  auth
});
