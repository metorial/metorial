import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'storyblok',
  name: 'Storyblok',
  description:
    'Headless CMS for creating, managing, and delivering structured content across multiple channels via REST and GraphQL APIs.',
  metadata: {},
  config,
  auth
});
