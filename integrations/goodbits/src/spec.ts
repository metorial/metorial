import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'goodbits',
  name: 'Goodbits',
  description:
    'Save articles from the web and build email newsletters in minutes. Manage subscribers, content library, and track email analytics.',
  metadata: {},
  config,
  auth
});
