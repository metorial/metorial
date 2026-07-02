import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'shotstack',
  name: 'Shotstack',
  description:
    'Video, image, and audio editing API with generative AI capabilities. Automate video rendering, asset management, and media generation.',
  metadata: {},
  config,
  auth
});
