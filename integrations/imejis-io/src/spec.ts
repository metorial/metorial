import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'imejisio',
  name: 'Imejis.io',
  description:
    'Generate custom images from pre-designed templates using dynamic data via the Imejis.io API. Create social media graphics, e-commerce banners, and more with customizable text, colors, and images.',
  metadata: {},
  config,
  auth
});
