import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'sonarqube',
  name: 'SonarQube',
  description:
    'Inspect SonarQube Server and SonarQube Cloud projects, quality gates, measures, issues, branches, pull requests, and analysis task status.',
  metadata: {},
  config,
  auth
});
