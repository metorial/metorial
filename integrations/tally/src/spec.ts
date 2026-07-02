import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'tally',
  name: 'Tally',
  description:
    'Tally is an online form builder for creating forms, surveys, and quizzes. Connect to manage forms, submissions, workspaces, and receive real-time form response notifications.',
  metadata: {},
  config,
  auth
});
