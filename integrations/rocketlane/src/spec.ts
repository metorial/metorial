import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'rocketlane',
  name: 'Rocketlane',
  description:
    'Collaborative customer onboarding and implementation platform for professional services teams.',
  metadata: {},
  config,
  auth
});
