import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'adrapid',
  name: 'Adrapid',
  description:
    'Scalable and automatic creation of visual marketing assets including animated banners, images, and videos from templates.',
  metadata: {},
  config,
  auth
});
