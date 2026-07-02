import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'canvas',
  name: 'Canvas',
  description:
    'Canvas LMS by Instructure. Manage courses, assignments, enrollments, grading, discussions, modules, pages, quizzes, calendar events, messaging, files, and analytics.',
  metadata: {},
  config,
  auth
});
