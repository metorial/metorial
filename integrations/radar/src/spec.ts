import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'radar',
  name: 'Radar',
  description:
    'Location data infrastructure platform providing geofencing, location tracking, trip tracking, fraud detection, geocoding, search, routing, and maps services.',
  metadata: {},
  config,
  auth
});
