import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'process-street',
  name: 'Process Street',
  description:
    'Process management platform for creating, managing, and running structured workflows with task management, approvals, form data collection, and data sets.',
  metadata: {},
  config,
  auth
});
