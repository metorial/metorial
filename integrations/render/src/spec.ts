import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'render',
  name: 'Render',
  description:
    'Deploy and manage cloud infrastructure on Render, including web services, APIs, databases, cron jobs, and background workers.',
  metadata: {},
  config,
  auth
});
