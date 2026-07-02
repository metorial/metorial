import { SlateSpecification } from '@slates/provider';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'tiktok',
  name: 'TikTok',
  description:
    'Integration with TikTok for Developers (user profiles, video management, content posting) and TikTok API for Business (advertising campaigns, ad groups, ads, and performance reporting).',
  metadata: {},
  config,
  auth
});
