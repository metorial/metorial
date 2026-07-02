import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'hypeauditor',
  name: 'HypeAuditor',
  description:
    'AI-powered influencer marketing platform for influencer discovery, analytics, fraud detection, and campaign management across Instagram, YouTube, TikTok, Twitter/X, Twitch, and Snapchat.',
  metadata: {},
  config,
  auth
});
