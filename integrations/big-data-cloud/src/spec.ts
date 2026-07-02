import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'bigdatacloud',
  name: 'Big Data Cloud',
  description:
    'IP geolocation, reverse geocoding, phone and email verification, and network intelligence APIs.',
  metadata: {},
  config,
  auth
});
