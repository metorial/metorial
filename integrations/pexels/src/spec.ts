import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'pexels',
  name: 'Pexels',
  description:
    'Search, retrieve, and download stock photos and videos from the Pexels library.',
  metadata: {},
  config,
  auth
});
