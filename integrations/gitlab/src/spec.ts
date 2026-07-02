import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'gitlab',
  name: 'GitLab',
  description:
    'Manage GitLab projects, repositories, issues, merge requests, releases, CI/CD pipelines, jobs, variables, environments, schedules, triggers, runners, deployments, and test reports.',
  metadata: {},
  config,
  auth
});
