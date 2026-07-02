import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'supersaas',
  name: 'SuperSaaS',
  description:
    'Online appointment scheduling platform for booking and calendar management. Manage schedules, appointments, users, forms, and promotions.',
  metadata: {},
  config,
  auth
});
