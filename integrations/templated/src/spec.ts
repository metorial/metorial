import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'templated',
  name: 'Templated',
  description:
    'API service for automated generation of images, videos, and PDFs from reusable templates.',
  metadata: {},
  config,
  auth
});
