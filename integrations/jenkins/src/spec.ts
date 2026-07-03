import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'jenkins',
  name: 'Jenkins',
  description:
    'Inspect Jenkins CI jobs, trigger builds, read queues, logs, test results, SCM metadata, and controller status through Jenkins Remote Access API endpoints.',
  metadata: {},
  config,
  auth
});
