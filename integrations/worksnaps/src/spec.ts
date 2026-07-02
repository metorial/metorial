import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'worksnaps',
  name: 'Worksnaps',
  description:
    'Time tracking and remote team monitoring with automatic screenshots, activity metrics, and productivity reports.',
  metadata: {},
  config,
  auth
});
