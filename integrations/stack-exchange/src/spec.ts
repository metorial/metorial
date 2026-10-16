import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'stack-exchange',
  name: 'Stack Exchange',
  description:
    'Search and manage Q&A content across communities on the Stack Exchange network.',
  metadata: {},
  config,
  auth
});
