import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'krakenio',
  name: 'Kraken.io',
  description:
    'Image optimization and compression service supporting JPG, PNG, WebP, GIF, SVG, AVIF, HEIC, and PDF formats. Provides lossy and lossless compression, image resizing, format conversion, and cloud storage integration.',
  metadata: {},
  config,
  auth
});
