import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'deepimage',
  name: 'Deep Image',
  description:
    'AI-powered image processing service for enhancement, upscaling, background removal, noise reduction, and more.',
  metadata: {},
  config,
  auth
});
