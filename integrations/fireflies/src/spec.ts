import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'fireflies',
  name: 'Fireflies',
  description:
    'AI-powered meeting assistant that records, transcribes, and analyzes voice conversations. Provides programmatic access to meeting transcripts, AI-generated summaries, user management, and audio upload capabilities.',
  metadata: {},
  config,
  auth
});
