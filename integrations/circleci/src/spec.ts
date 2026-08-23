import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'circleci',
  name: 'CircleCI',
  description:
    'Trigger and inspect CircleCI pipelines, workflows, and jobs; manage contexts, environment variables, schedules, and outbound webhooks; and review build insights and flaky tests.',
  metadata: {},
  config,
  auth
});
