import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'builtwith',
  name: 'BuiltWith',
  description:
    'Web technology profiler that detects and tracks technology stacks used by websites. Provides technology adoption data, ecommerce insights, lead generation, competitive analysis, and trust scoring across 250+ million websites.',
  metadata: {},
  config,
  auth
});
