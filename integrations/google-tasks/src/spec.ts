import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'google-tasks',
  name: 'Google Tasks',
  description:
    'Create, read, update, and delete task lists and individual tasks in Google Tasks. Supports task hierarchies, ordering, filtering, and incremental sync.',
  metadata: {},
  config,
  auth
});
