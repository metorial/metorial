import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'classmarker',
  name: 'ClassMarker',
  description:
    'Online quiz and exam platform for creating, administering, and grading tests and assessments.',
  metadata: {},
  config,
  auth
});
