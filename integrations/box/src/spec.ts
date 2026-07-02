import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'box',
  name: 'Box',
  description:
    'Cloud-based content management platform for secure file storage, sharing, collaboration, e-signatures, and AI-powered content analysis.',
  metadata: {},
  config,
  auth
});
