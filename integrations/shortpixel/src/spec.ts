import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'shortpixel',
  name: 'Shortpixel',
  description:
    'Cloud-based image optimization service that compresses, resizes, and converts images and PDFs to reduce file sizes with support for WebP, AVIF, and other next-gen formats.',
  metadata: {},
  config,
  auth
});
