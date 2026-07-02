import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'doodle',
  name: 'Doodle',
  description:
    'Online scheduling platform for group meeting polls, booking pages, and sign-up sheets with calendar and video conferencing integrations.',
  metadata: {},
  config,
  auth
});
