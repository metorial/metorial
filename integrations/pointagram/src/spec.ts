import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'pointagram',
  name: 'Pointagram',
  description:
    'Gamification platform for managing players, tracking points via score series, running competitions, and motivating teams through point-based games.',
  metadata: {},
  config,
  auth
});
