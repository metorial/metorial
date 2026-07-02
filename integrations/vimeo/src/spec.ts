import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'vimeo',
  name: 'Vimeo',
  description:
    'Upload, manage, and stream videos on Vimeo. Search videos, organize content with showcases and folders, manage channels, and receive real-time event notifications.',
  metadata: {},
  config,
  auth
});
