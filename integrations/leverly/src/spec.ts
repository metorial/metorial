import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'leverly',
  name: 'Leverly',
  description:
    'Lead response management platform that converts inbound lead form data into instant phone calls to sales reps, with automated call persistence, multi-channel follow-up, and AI-powered call handling.',
  metadata: {},
  config,
  auth
});
