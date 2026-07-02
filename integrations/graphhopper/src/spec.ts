import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'graphhopper',
  name: 'GraphHopper',
  description:
    'Routing and logistics API platform built on OpenStreetMap data. Provides route calculation, route optimization, distance/time matrices, geocoding, isochrones, map matching, and clustering.',
  metadata: {},
  config,
  auth
});
