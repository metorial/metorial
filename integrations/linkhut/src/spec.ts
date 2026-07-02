import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'linkhut',
  name: 'Linkhut',
  description:
    'Open-source social bookmarking service for saving, tagging, managing, and sharing web bookmarks. API-compatible with Pinboard.',
  metadata: {},
  config,
  auth
});
