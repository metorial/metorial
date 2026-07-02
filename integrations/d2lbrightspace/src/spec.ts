import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'd2l-brightspace',
  name: 'D2L Brightspace',
  description:
    'Integration with D2L Brightspace LMS for managing courses, users, enrollments, grades, assignments, discussions, and more.',
  metadata: {},
  config,
  auth
});
