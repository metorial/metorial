import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'midjourney',
  name: 'Midjourney',
  description:
    'Generate images from text prompts, create variations, upscale, blend images, and describe images using Midjourney via unofficial third-party API providers.',
  metadata: {},
  config,
  auth
});
