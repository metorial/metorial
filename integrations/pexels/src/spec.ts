import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'pexels',
  name: 'Pexels',
  description:
    'Search and retrieve free, royalty-free stock photos and videos from the Pexels library.',
  metadata: {},
  config,
  auth
});
