import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'github',
  name: 'GitHub',
  description:
    'Cloud-based platform for version control and collaboration using Git. Provides repository hosting, issue tracking, pull requests, code review, CI/CD with GitHub Actions, and project management.',
  metadata: {},
  config,
  auth
});
