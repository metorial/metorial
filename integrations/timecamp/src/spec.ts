import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'timecamp',
  name: 'TimeCamp',
  description:
    'Time tracking software for teams and individuals. Track time on tasks and projects, manage attendance, create invoices, and analyze productivity.',
  metadata: {},
  config,
  auth
});
