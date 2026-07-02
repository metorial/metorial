import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'imgix',
  name: 'Imgix',
  description:
    'Image and video processing service providing real-time URL-based transformation, optimization, and CDN delivery. Manage sources, assets, cache purging, and analytics.',
  metadata: {},
  config,
  auth
});
