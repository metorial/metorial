import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'botpress',
  name: 'Botpress',
  description:
    'Build, deploy, and manage AI-powered chatbots and agents with Botpress. Manage bots, conversations, messages, users, structured data tables, files, and integrations.',
  metadata: {},
  config,
  auth
});
