import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'contentful',
  name: 'Contentful',
  description:
    'Read and manage Contentful content with the appropriate API credential and data residency region.',
  metadata: {},
  config,
  auth
});
