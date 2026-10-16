import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'hackerrank-work',
  name: 'HackerRank Work',
  description:
    'Manage technical assessments, candidate invitations and results, live coding interviews, users, and teams.',
  metadata: {},
  config,
  auth
});
