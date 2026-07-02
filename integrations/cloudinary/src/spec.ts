import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'cloudinary',
  name: 'Cloudinary',
  description:
    'Cloud-based media management platform for uploading, storing, transforming, optimizing, and delivering images, videos, and files via a global CDN.',
  metadata: {},
  config,
  auth
});
