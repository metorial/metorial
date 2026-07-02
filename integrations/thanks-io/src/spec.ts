import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'thanksio',
  name: 'Thanks.io',
  description:
    'Cloud-based direct mail automation platform for sending personalized handwritten postcards, letters, notecards, and gift cards at scale.',
  metadata: {},
  config,
  auth
});
