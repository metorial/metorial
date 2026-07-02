import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'amara',
  name: 'Amara',
  description:
    'Web-based platform for video subtitling, captioning, and translation with collaborative team workflows.',
  metadata: {},
  config,
  auth
});
