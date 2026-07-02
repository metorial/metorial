import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'brandfetch',
  name: 'Brandfetch',
  description:
    'Brand data aggregation platform providing programmatic access to company brand assets including logos, colors, fonts, images, and firmographic data.',
  metadata: {},
  config,
  auth
});
