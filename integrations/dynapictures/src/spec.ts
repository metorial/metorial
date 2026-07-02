import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'dynapictures',
  name: 'DynaPictures',
  description:
    'Cloud-based dynamic image and PDF generation platform for creating customized images from reusable templates via API.',
  metadata: {},
  config,
  auth
});
