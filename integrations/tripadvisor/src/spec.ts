import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'tripadvisor',
  name: 'Tripadvisor',
  description:
    'Find Tripadvisor places and content, map properties, and manage hotel guest review email requests with Review Express.',
  metadata: {},
  config,
  auth
});
