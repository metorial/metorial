import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'ganai',
  name: 'Gan.ai',
  description:
    'AI platform for personalized video creation, text-to-speech synthesis, AI avatar generation, lip-sync video production, and sound effect generation. Supports the Playground API for TTS, avatars, lip-sync, and sound effects, and the Studio API for personalized video campaigns at scale.',
  metadata: {},
  config,
  auth
});
