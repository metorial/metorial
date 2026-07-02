import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'buffer',
  name: 'Buffer',
  description:
    'Social media management platform for scheduling, publishing, and analyzing posts across multiple social networks.',
  metadata: {},
  config,
  auth
});
