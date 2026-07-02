import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'opencage',
  name: 'OpenCage',
  description:
    'Worldwide geocoding based on open data. Convert addresses to coordinates (forward geocoding) and coordinates to addresses (reverse geocoding).',
  metadata: {},
  config,
  auth
});
