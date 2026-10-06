import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'superhuman-gmail',
  name: 'Superhuman Gmail',
  description:
    'Gmail-backed conversation search, context, triage, reply drafts, sending, mailbox identity and file downloads. This uses the Gmail API, independently of Superhuman Mail native features.',
  metadata: {},
  config,
  auth
});
