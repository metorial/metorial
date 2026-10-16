import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'hacker-news',
  name: 'Hacker News',
  description:
    'Read Hacker News stories, discussions, user profiles, and updates, with full-text search.',
  metadata: {},
  config,
  auth
});
