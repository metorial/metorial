import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'stannp',
  name: 'Stannp',
  description:
    'Direct mail automation platform for sending postcards, letters, greetings cards, and SMS programmatically.',
  metadata: {},
  config,
  auth
});
