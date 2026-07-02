import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'abyssale',
  name: 'Abyssale',
  description:
    'Creative automation platform for programmatically generating images, videos, PDFs, GIFs, and HTML5 banners from pre-designed templates.',
  metadata: {},
  config,
  auth
});
