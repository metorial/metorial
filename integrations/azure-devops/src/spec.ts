import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'azure-devops',
  name: 'Azure DevOps',
  description:
    'Microsoft platform for developer services including Git repositories, CI/CD pipelines, work item tracking, test plans, and package feeds.',
  metadata: {},
  config,
  auth
});
