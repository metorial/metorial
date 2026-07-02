import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'baselinker',
  name: 'Baselinker',
  description:
    'E-commerce management platform integrating marketplaces, online stores, couriers, and accounting systems.',
  metadata: {},
  config,
  auth
});
