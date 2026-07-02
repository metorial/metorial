import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'route4me',
  name: 'Route4Me',
  description:
    'Cloud-based route optimization and logistics platform for planning, managing, and executing delivery or pickup routes with support for geocoding, GPS tracking, fleet management, and more.',
  metadata: {},
  config,
  auth
});
