import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'timecamp',
  name: 'TimeCamp',
  description:
    'Track time entries and live timers, organize projects and tasks, discover users and groups, review attendance, and manage tags. Existing client and invoice tools are also included; their routes are not described in the current public API reference.',
  metadata: {},
  config,
  auth
});
