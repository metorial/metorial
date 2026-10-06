import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'shippo',
  name: 'Shippo',
  description:
    'Compare connected carrier rates, create labels and shipments, track packages, and download shipping documents.',
  metadata: {},
  config,
  auth
});
