import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'posthog',
  name: 'PostHog',
  description:
    'Open-source product analytics platform providing product analytics, session replay, feature flags, A/B testing, surveys, and more.',
  metadata: {},
  config,
  auth
});
