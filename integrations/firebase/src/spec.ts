import { SlateSpecification } from '@slates/provider';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'firebase',
  name: 'Firebase',
  description:
    'Firebase is a Google-backed Backend-as-a-Service platform providing cloud databases, user authentication, cloud messaging, file storage, remote configuration, and serverless functions.',
  metadata: {},
  config,
  auth
});
