import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'ifttt',
  name: 'IFTTT',
  description:
    'Automation platform that connects services through triggers, queries, and actions. Manage connections, fire webhooks, run actions, and execute queries via the Connect API and Webhooks service.',
  metadata: {},
  config,
  auth
});
