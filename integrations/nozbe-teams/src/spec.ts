import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'nozbe-teams',
  name: 'Nozbe Teams',
  description:
    'Collaborative task and project management for teams. Manage projects, tasks, comments, tags, and team members.',
  metadata: {},
  config,
  auth
});
