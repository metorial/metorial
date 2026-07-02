import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'elevenlabs',
  name: 'ElevenLabs',
  description:
    'AI audio platform for text-to-speech, speech-to-text, voice cloning, music generation, sound effects, dubbing, and conversational voice agents.',
  metadata: {},
  config,
  auth
});
