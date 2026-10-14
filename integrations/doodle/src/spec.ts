import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'doodle',
  name: 'Doodle',
  description:
    'Manage legacy Doodle group scheduling polls, participants, votes, and comments through an existing Enterprise API connection. New API access is no longer supported by Doodle.',
  metadata: {},
  config,
  auth
});
