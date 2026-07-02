import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'shortcut',
  name: 'Shortcut',
  description:
    'Project management platform for software teams. Manage stories, epics, objectives, iterations, workflows, and documents.',
  metadata: {},
  config,
  auth
});
