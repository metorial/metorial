import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'apibible',
  name: 'API.Bible',
  description:
    'Browse licensed Bible editions, retrieve scripture and reference search results, and download available chapter audio through API.Bible.',
  metadata: {},
  config,
  auth
});
