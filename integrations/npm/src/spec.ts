import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'npm',
  name: 'npm',
  description:
    'Node Package Manager registry — search, retrieve metadata, download counts, publish packages, and manage tokens.',
  metadata: {},
  config,
  auth
});
