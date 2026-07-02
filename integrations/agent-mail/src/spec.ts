import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'agent-mail',
  name: 'Agent Mail',
  description:
    'API platform for giving AI agents their own email inboxes to send, receive, and act upon emails. Agents can manage inboxes, threads, drafts, custom domains, and multi-tenant pods entirely through the API.',
  metadata: {},
  config,
  auth
});
