import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'alttextai',
  name: 'AltText.ai',
  description:
    'AI-powered alt text generation for images. Supports 130+ languages, SEO keywords, e-commerce context, and configurable writing styles to improve web accessibility and search engine optimization.',
  metadata: {},
  config,
  auth
});
