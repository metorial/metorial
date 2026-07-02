import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'dailybot',
  name: 'DailyBot',
  description:
    'Team productivity platform for async check-ins, forms, peer recognition (kudos), and messaging across Slack, Microsoft Teams, Google Chat, and Discord.',
  metadata: {},
  config,
  auth
});
