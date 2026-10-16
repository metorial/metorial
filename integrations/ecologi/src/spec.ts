import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'ecologi',
  name: 'Ecologi',
  description:
    'Fund tree planting, carbon avoidance, carbon removal, and habitat restoration through Ecologi, and retrieve public impact totals by username.',
  metadata: {},
  config,
  auth
});
