import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'slack',
  name: 'Slack',
  description:
    'Collaborate in Slack with messages, conversations, search, files, Canvases, Lists, profiles, and workspace productivity tools.',
  metadata: {},
  config,
  auth
});
