import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'google-ads',
  name: 'Google Ads',
  description:
    'Google Ads integration for managing campaigns, ad groups, ads, keywords, bidding strategies, conversion tracking, audience targeting, and reporting across Google Search, Display, Video, and Shopping networks.',
  metadata: {},
  config,
  auth
});
