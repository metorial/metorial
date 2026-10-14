import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'serply',
  name: 'Serply',
  description:
    'Search engine results API providing structured JSON data from Google and Bing for web, news, images, videos, products, jobs, academic papers, and Maps places.',
  metadata: {},
  config,
  auth
});
