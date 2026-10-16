import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'expofp',
  name: 'ExpoFP',
  description:
    'Manage event exhibitors, booth assignments, categories, extras, sessions, and offline floor-plan archives.',
  metadata: {},
  config,
  auth
});
