import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'removebg',
  name: 'Remove.bg',
  description:
    'AI-powered image background removal service that automatically detects foreground subjects and removes or replaces backgrounds.',
  metadata: {},
  config,
  auth
});
