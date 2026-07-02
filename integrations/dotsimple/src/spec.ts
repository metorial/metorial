import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'dotsimple',
  name: 'Dotsimple',
  description:
    'DotSimple is a social media management platform for planning, creating, scheduling, and publishing content across multiple social networks from a single workspace.',
  metadata: {},
  config,
  auth
});
