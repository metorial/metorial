import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'ko-fi',
  name: 'Ko-fi',
  description:
    'Receive webhook notifications for Ko-fi payment events including donations, subscriptions, shop orders, and commissions.',
  metadata: {},
  config,
  auth
});
