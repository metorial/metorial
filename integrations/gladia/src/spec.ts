import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'gladia',
  name: 'Gladia',
  description:
    'Audio transcription and intelligence API supporting 100+ languages with diarization, translation, summarization, sentiment analysis, and more.',
  metadata: {},
  config,
  auth
});
