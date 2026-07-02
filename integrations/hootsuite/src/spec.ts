import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'hootsuite',
  name: 'Hootsuite',
  description:
    'Social media management platform for scheduling, publishing, analytics, and team collaboration across social networks.',
  metadata: {},
  config,
  auth
});
