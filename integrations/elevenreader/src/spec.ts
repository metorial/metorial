import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'elevenreader',
  name: 'Elevenreader',
  description:
    'ElevenLabs text-to-speech, speech-to-text, voice management, sound effects, music generation, dubbing, and conversational AI platform.',
  metadata: {},
  config,
  auth
});
