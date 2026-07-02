import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'tinypng',
  name: 'TinyPNG',
  description:
    'Image optimization service that compresses AVIF, WebP, JPEG, and PNG images using lossy compression while preserving visual quality. Supports resizing, format conversion, metadata preservation, and direct cloud storage uploads.',
  metadata: {},
  config,
  auth
});
