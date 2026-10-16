import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'linguapop',
  name: 'Linguapop',
  description:
    'Discover available languages and create CEFR-aligned placement test invitations with email, kiosk, reading, listening, and completion callback options.',
  metadata: {},
  config,
  auth
});
