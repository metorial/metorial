import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'getform',
  name: 'Getform',
  description:
    'Headless form backend API for collecting, storing, and managing form submissions with file uploads, spam protection, and webhook notifications.',
  metadata: {},
  config,
  auth
});
