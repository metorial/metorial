import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'simple-analytics',
  name: 'Simple Analytics',
  description:
    'Privacy-focused web analytics platform that tracks website visitors without cookies or trackers. Provides page view analytics, visitor metrics, event tracking, and raw data export through a JSON-based API.',
  metadata: {},
  config,
  auth
});
