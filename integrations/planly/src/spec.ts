import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'planly',
  name: 'Planly',
  description:
    'Social media management platform for scheduling and auto-publishing posts across Instagram, Facebook, Twitter/X, LinkedIn, Pinterest, TikTok, YouTube, Threads, Mastodon, and Bluesky.',
  metadata: {},
  config,
  auth
});
