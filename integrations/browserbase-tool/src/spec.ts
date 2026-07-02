import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'browserbase',
  name: 'Browserbase',
  description:
    'Cloud platform for running headless browsers at scale with stealth mode, session persistence, and debugging tools.',
  metadata: {},
  config,
  auth
});
