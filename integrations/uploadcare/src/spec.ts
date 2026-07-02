import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'uploadcare',
  name: 'Uploadcare',
  description:
    'Cloud-based file handling platform for uploading, storing, processing, and delivering files via a global CDN with on-the-fly image processing.',
  metadata: {},
  config,
  auth
});
