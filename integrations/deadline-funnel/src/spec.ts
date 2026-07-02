import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'deadline-funnel',
  name: 'Deadline Funnel',
  description:
    'Deadline Funnel creates personalized countdown timers and deadlines for sales pages and evergreen campaigns to drive conversions.',
  metadata: {},
  config,
  auth
});
