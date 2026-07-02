import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'fillout-forms',
  name: 'Fillout Forms',
  description:
    'Online form builder for creating forms, surveys, and quizzes with support for scheduling, payments, and quiz scoring.',
  metadata: {},
  config,
  auth
});
