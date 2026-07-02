import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'aiml-api',
  name: 'Ai/ml API',
  description:
    'Unified gateway to 400+ AI/ML models for text, image, video, audio, embeddings, moderation, and search.',
  metadata: {},
  config,
  auth
});
