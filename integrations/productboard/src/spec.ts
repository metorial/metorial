import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'productboard',
  name: 'Productboard',
  description:
    'Product management platform for collecting feedback, prioritizing features, and planning roadmaps.',
  metadata: {},
  config,
  auth
});
