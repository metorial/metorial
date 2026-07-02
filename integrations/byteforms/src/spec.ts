import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'byteforms',
  name: 'Byteforms',
  description:
    'Form builder platform for creating forms, surveys, and quizzes with submission management, payment collection, and third-party integrations.',
  metadata: {},
  config,
  auth
});
