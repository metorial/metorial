import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'superhuman-microsoft-365',
  name: 'Superhuman Microsoft 365',
  description:
    'Conversation-first Microsoft 365 mail workflows for inbox triage, thread context, reply drafts, and send/reply using Microsoft Graph.',
  metadata: {},
  config,
  auth
});
