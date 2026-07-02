import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'rafflys',
  name: 'Rafflys',
  description:
    'Social media giveaway and contest management platform for running sweepstakes, promotions, and fortune wheel campaigns across Instagram, Facebook, Twitter/X, YouTube, TikTok, LinkedIn, Bluesky, and Twitch.',
  metadata: {},
  config,
  auth
});
