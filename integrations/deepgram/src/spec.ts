import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'deepgram',
  name: 'Deepgram',
  description:
    'Voice AI platform for speech-to-text, text-to-speech, and text intelligence. Transcribe audio in 45+ languages, generate natural-sounding speech, and analyze text for sentiment, topics, summaries, and intents.',
  metadata: {},
  config,
  auth
});
