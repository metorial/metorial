import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'imagior',
  name: 'Imagior',
  description:
    'Automated image generation software for creating and customizing images from design templates.',
  metadata: {},
  config,
  auth
});
