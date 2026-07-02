import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'claidai',
  name: 'Claid.ai',
  description:
    'AI-powered image processing API for editing, enhancement, background generation, AI fashion photoshoots, text-to-image generation, and image-to-video conversion.',
  metadata: {},
  config,
  auth
});
