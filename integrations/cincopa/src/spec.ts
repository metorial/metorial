import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'cincopa',
  name: 'Cincopa',
  description:
    'Multimedia hosting and management platform for video, audio, images, and digital media with galleries, portals, live streaming, and analytics.',
  metadata: {},
  config,
  auth
});
