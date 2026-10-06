import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'dreamstudio',
  name: 'DreamStudio',
  description:
    'Generate and transform images, upscale photos, create 3D model files, and inspect your Stability AI account.',
  metadata: {},
  config,
  auth
});
