import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'azure-functions',
  name: 'Azure Functions',
  description:
    'Manage and invoke Azure Functions serverless compute resources. List and configure function apps, invoke HTTP-triggered functions, manage access keys, deployment slots, and application settings.',
  metadata: {},
  config,
  auth
});
