import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'mem',
  name: 'Mem',
  description:
    'AI-powered note-taking and personal knowledge management. Create, search, and organize notes and collections, and use AI to process raw content into your knowledge base.',
  metadata: {},
  config,
  auth
});
