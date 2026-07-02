import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'supportivekoala',
  name: 'Supportivekoala',
  description:
    'Automate image generation using customizable templates. Create reusable templates, populate them with dynamic content, and export images in PNG, JPEG, or WebP formats.',
  metadata: {},
  config,
  auth
});
