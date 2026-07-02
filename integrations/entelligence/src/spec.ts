import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'entelligence',
  name: 'Entelligence',
  description:
    'AI-powered engineering intelligence platform that provides automated code reviews, codebase documentation generation, natural language codebase chat, and team performance analytics.',
  metadata: {},
  config,
  auth
});
