import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'rev-ai',
  name: 'Rev AI',
  description:
    'Speech-to-text and text analysis for recorded media, including transcription, language identification, sentiment analysis, topic extraction, summarization, translation, downloadable captions, and custom vocabularies.',
  metadata: {},
  config,
  auth
});
