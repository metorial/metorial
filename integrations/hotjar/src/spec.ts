import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'hotjar',
  name: 'Hotjar',
  description:
    'Behavior analytics and user feedback platform providing heatmaps, session recordings, and surveys. Access survey response data and manage user data for privacy compliance.',
  metadata: {},
  config,
  auth
});
