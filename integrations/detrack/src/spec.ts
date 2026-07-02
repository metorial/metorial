import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'detrack',
  name: 'Detrack',
  description:
    'Cloud-based delivery management platform for real-time vehicle tracking, electronic proof of delivery, route optimization, and job management.',
  metadata: {},
  config,
  auth
});
