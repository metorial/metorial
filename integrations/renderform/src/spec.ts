import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'renderform',
  name: 'Renderform',
  description:
    'Template-based image, PDF, and screenshot generation API with CDN hosting and webhook notifications.',
  metadata: {},
  config,
  auth
});
