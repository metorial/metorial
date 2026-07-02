import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'sendlane',
  name: 'Sendlane',
  description:
    'Email and SMS marketing automation platform for eCommerce. Manage contacts, lists, tags, campaigns, and track eCommerce events.',
  metadata: {},
  config,
  auth
});
