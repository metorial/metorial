import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'toggl',
  name: 'Toggl',
  description:
    'Toggl Track is a time tracking service for individuals and teams. Manage time entries, projects, clients, tags, tasks, and workspaces. Retrieve workspace details and generate summary or detailed reports.',
  metadata: {},
  config,
  auth
});
