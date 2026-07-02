import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'listen-notes',
  name: 'Listen Notes',
  description:
    'Podcast search engine and database API for searching, browsing, and retrieving metadata for millions of podcasts and episodes.',
  metadata: {},
  config,
  auth
});
