import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'bugsnag',
  name: 'Bugsnag',
  description:
    'Error monitoring and application stability management platform that captures crashes and errors in real-time from web, mobile, and desktop applications.',
  metadata: {},
  config,
  auth
});
