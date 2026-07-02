import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'motion',
  name: 'Motion',
  description:
    'AI-powered productivity platform that automates task scheduling, calendar management, and project planning.',
  metadata: {},
  config,
  auth
});
