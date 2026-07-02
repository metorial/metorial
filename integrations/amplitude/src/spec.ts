import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'amplitude',
  name: 'Amplitude',
  description:
    'Product analytics platform for tracking user behavior, analyzing engagement, measuring retention, and running experiments.',
  metadata: {},
  config,
  auth
});
