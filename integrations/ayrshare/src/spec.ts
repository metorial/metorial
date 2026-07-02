import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'ayrshare',
  name: 'Ayrshare',
  description:
    'Unified social media API for publishing, scheduling, analytics, and management across 13 platforms including Facebook, X/Twitter, Instagram, LinkedIn, TikTok, YouTube, and more.',
  metadata: {},
  config,
  auth
});
