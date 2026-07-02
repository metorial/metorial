import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'typefully',
  name: 'Typefully',
  description:
    'Social media management platform for creating, scheduling, and publishing content across X (Twitter), LinkedIn, Threads, Bluesky, and Mastodon.',
  metadata: {},
  config,
  auth
});
