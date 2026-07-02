import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'loopsso',
  name: 'Loops.so',
  description:
    'Email platform for SaaS companies. Manage contacts, send transactional and marketing emails, trigger automated workflows, and track email engagement.',
  metadata: {},
  config,
  auth
});
