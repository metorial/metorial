import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'bart',
  name: 'BART',
  description:
    'Bay Area Rapid Transit (BART) integration providing real-time departure estimates, trip planning, fare information, station details, route data, service advisories, elevator status, and schedule information.',
  metadata: {},
  config,
  auth
});
