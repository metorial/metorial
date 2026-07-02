import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'imgbb',
  name: 'ImgBB',
  description:
    'Free image hosting and sharing platform. Upload images and receive publicly accessible hosted URLs with thumbnail and medium-sized variants.',
  metadata: {},
  config,
  auth
});
