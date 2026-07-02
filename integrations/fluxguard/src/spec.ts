import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'fluxguard',
  name: 'Fluxguard',
  description:
    'AI-powered web change monitoring platform that detects, filters, and summarizes changes to websites including text, HTML, visual, and network activity.',
  metadata: {},
  config,
  auth
});
