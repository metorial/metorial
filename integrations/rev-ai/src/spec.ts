import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'rev-ai',
  name: 'Rev AI',
  description:
    'Speech-to-text and natural language processing platform by Rev, offering transcription, language identification, sentiment analysis, topic extraction, summarization, and translation for 57+ languages.',
  metadata: {},
  config,
  auth
});
