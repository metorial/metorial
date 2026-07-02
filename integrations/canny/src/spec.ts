import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'canny',
  name: 'Canny',
  description:
    'Feedback management platform for collecting, organizing, and prioritizing user feedback and feature requests.',
  metadata: {},
  config,
  auth
});
