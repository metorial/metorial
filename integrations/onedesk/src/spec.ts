import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'onedesk',
  name: 'OneDesk',
  description:
    'A combined help desk and project management platform. Create, update, and search tickets, tasks, and projects; post conversation messages; create users; and discover organization settings, users, and teams.',
  metadata: {},
  config,
  auth
});
