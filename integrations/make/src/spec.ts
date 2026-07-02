import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'make',
  name: 'Make',
  description:
    'Make (formerly Integromat) is a no-code automation platform for creating workflows by connecting apps and services. Manage scenarios, connections, data stores, webhooks, teams, and organizations.',
  metadata: {},
  config,
  auth
});
