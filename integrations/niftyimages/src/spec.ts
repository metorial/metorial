import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'niftyimages',
  name: 'NiftyImages',
  description:
    'Email marketing tool for dynamic, personalized images, countdown timers, and data-driven content.',
  metadata: {},
  config,
  auth
});
