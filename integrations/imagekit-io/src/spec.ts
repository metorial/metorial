import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'imagekit',
  name: 'ImageKit',
  description:
    'Cloud-based image and video optimization, transformation, and delivery platform with integrated Digital Asset Management.',
  metadata: {},
  config,
  auth
});
