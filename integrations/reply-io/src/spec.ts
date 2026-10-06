import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'replyio',
  name: 'Reply.io',
  description:
    'Manage Reply.io contacts, outreach sequences and membership, email templates, private contact lists, blacklist rules and manual tasks. Discover the resolved user, sending schedules and email account statuses, and read sequence and team reporting.',
  metadata: {},
  config,
  auth
});
