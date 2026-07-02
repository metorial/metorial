import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'mixpanel',
  name: 'Mixpanel',
  description:
    'Mixpanel is a product analytics platform that tracks user interactions with web and mobile applications.',
  metadata: {},
  config,
  auth
});
