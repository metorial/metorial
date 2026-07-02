import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'midjourney',
  name: 'Midjourney',
  description:
    'Generate and edit Midjourney images, create and extend short videos, fetch asynchronous tasks, and inspect APIFRAME account credits via APIFRAME.',
  metadata: {},
  config,
  auth
});
