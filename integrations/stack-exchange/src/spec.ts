import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'stack-exchange',
  name: 'Stack Exchange',
  description:
    'Access Stack Overflow and 170+ community-powered Q&A sites on the Stack Exchange network.',
  metadata: {},
  config,
  auth
});
