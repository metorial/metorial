import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'reddit-ads',
  name: 'Reddit Ads',
  description:
    'Create, manage, and optimize advertising campaigns on Reddit. Configure campaign objectives, budgets, bidding strategies, and ad formats. Target audiences by subreddit, keyword, and interest. Manage custom audiences and send server-side conversion events. Retrieve campaign performance reports.',
  metadata: {},
  config,
  auth
});
