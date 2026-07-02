import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'sensibo',
  name: 'Sensibo',
  description:
    'Smart climate control platform for IoT devices including Sensibo Sky, Air, Air Pro, Pure, and Elements. Provides remote AC control, environmental monitoring, scheduling, and Climate React automation.',
  metadata: {},
  config,
  auth
});
