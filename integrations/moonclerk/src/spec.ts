import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'moonclerk',
  name: 'MoonClerk',
  description:
    'Cloud-based payment processing platform built on Stripe for accepting recurring and one-time payments through customizable payment forms.',
  metadata: {},
  config,
  auth
});
