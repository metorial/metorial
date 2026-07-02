import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'honeybadger',
  name: 'Honeybadger',
  description:
    'Application monitoring platform providing error tracking, uptime monitoring, check-ins, logging/insights, and status pages.',
  metadata: {},
  config,
  auth
});
