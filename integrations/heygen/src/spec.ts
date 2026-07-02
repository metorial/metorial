import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'heygen',
  name: 'HeyGen',
  description:
    'AI video generation platform that creates videos using realistic AI avatars with text-to-speech, video translation, and interactive streaming capabilities.',
  metadata: {},
  config,
  auth
});
