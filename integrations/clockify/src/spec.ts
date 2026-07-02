import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'clockify',
  name: 'Clockify',
  description:
    'Time tracking and timesheet application for teams. Track work hours on projects, manage workspaces, generate reports, handle invoicing, and manage time off.',
  metadata: {},
  config,
  auth
});
