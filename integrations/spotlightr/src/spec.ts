import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'spotlightr',
  name: 'Spotlightr',
  description: 'Manage Spotlightr videos, projects, player settings, analytics, and access.',
  metadata: {},
  config,
  auth
});
