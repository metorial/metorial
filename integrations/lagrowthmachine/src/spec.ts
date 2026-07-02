import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'la-growth-machine',
  name: 'La Growth Machine',
  description:
    'Multichannel sales outreach automation platform for managing prospecting campaigns across LinkedIn, email, and Twitter/X with built-in lead enrichment and audience management.',
  metadata: {},
  config,
  auth
});
