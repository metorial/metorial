import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'all-images-ai',
  name: 'All Images AI',
  description:
    'AI image generation and stock image platform powered by Midjourney. Generate images from text prompts, search and purchase stock images, and manage image downloads.',
  metadata: {},
  config,
  auth
});
