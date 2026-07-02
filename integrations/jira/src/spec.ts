import { SlateSpecification } from '@slates/provider';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'jira',
  name: 'Jira',
  description:
    'Project tracking and issue management platform by Atlassian. Manage issues, projects, sprints, boards, workflows, and users via the Jira Cloud REST API.',
  metadata: {},
  config,
  auth
});
