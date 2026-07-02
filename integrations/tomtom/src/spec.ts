import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'tomtom',
  name: 'Tomtom',
  description:
    'TomTom is a location technology provider offering APIs for search/geocoding, routing, real-time traffic, geofencing, location tracking, and notifications.',
  metadata: {},
  config,
  auth
});
