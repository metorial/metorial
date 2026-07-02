import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'stack-ai',
  name: 'Stack AI',
  description:
    'Enterprise platform for building and deploying AI agents and workflows. Execute flows, manage knowledge bases, handle documents, monitor analytics, and manage connections to external services.',
  metadata: {},
  config,
  auth
});
