import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'cursor',
  name: 'Cursor',
  description:
    'Launch and manage Cursor cloud agents and individual runs, retrieve downloadable files, and track Enterprise team usage, spending, members, and repository blocklists.',
  metadata: {},
  config,
  auth
});
