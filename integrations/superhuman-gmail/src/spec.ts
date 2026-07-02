import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'superhuman-gmail',
  name: 'Superhuman Gmail',
  description:
    'Conversation-first Gmail workflows: search threads, load full context for triage, batch-style label and mailbox actions, threaded reply drafts, send, and history-based change detection.',
  metadata: {},
  config,
  auth
});
