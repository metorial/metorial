import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'sentry',
  name: 'Sentry',
  description:
    'Application monitoring platform for error tracking, performance monitoring, and release health. Manage issues, projects, teams, releases, alerts, and cron monitors.',
  metadata: {},
  config,
  auth
});
