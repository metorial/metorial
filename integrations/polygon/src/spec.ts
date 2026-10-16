import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'polygon',
  name: 'Polygon',
  description:
    'Financial market data from Massive (formerly Polygon.io), covering stocks, options, forex, crypto, and indices.',
  metadata: {},
  config,
  auth
});
