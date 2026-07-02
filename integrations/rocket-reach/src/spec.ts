import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'rocketreach',
  name: 'RocketReach',
  description:
    'Contact data and business intelligence platform providing verified emails, phone numbers, and social links for 700M+ professionals and 60M+ companies.',
  metadata: {},
  config,
  auth
});
