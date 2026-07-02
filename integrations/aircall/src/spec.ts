import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'aircall',
  name: 'Aircall',
  description:
    'Cloud-based phone system for businesses providing voice calling, SMS messaging, contact management, and real-time communication tools.',
  metadata: {},
  config,
  auth
});
