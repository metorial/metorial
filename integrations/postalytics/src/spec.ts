import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'postalytics',
  name: 'Postalytics',
  description:
    'Direct mail automation platform for programmatically sending and tracking personalized postcards, letters, and self-mailers across the United States and Canada.',
  metadata: {},
  config,
  auth
});
