import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'apibible',
  name: 'API.Bible',
  description:
    'Access Bible scripture content in text and audio formats from nearly 2500 Bible versions across over 1600 languages via the American Bible Society API.',
  metadata: {},
  config,
  auth
});
