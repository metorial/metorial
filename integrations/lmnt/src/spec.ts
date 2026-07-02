import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'lmnt',
  name: 'LMNT',
  description:
    'AI-powered text-to-speech and voice cloning platform. Generate lifelike speech from text using pre-built or custom cloned voices with support for multiple languages and real-time streaming.',
  metadata: {},
  config,
  auth
});
