import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'codacy',
  name: 'Codacy',
  description:
    'Automated code review and quality platform that performs static analysis, security scanning, code coverage tracking, and duplication detection across 49+ programming languages.',
  metadata: {},
  config,
  auth
});
