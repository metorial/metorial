import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'geoapify',
  name: 'Geoapify',
  description:
    'Location platform providing geospatial APIs for geocoding, routing, places search, isolines, boundaries, and more, built on OpenStreetMap data.',
  metadata: {},
  config,
  auth
});
