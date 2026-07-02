import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'bannerbear',
  name: 'Bannerbear',
  description:
    'Auto-generate images, videos, animated GIFs, PDFs, and screenshots from reusable design templates via API.',
  metadata: {},
  config,
  auth
});
