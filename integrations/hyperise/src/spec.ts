import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'hyperise',
  name: 'Hyperise',
  description:
    'Hyper-personalization platform for creating dynamically personalized images, videos, and website content tailored to individual recipients.',
  metadata: {},
  config,
  auth
});
