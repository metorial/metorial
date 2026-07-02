import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'desktime',
  name: 'DeskTime',
  description:
    'Automated time tracking and productivity monitoring software for teams. Tracks employee work hours, application/website usage, productivity levels, and supports project time tracking.',
  metadata: {},
  config,
  auth
});
