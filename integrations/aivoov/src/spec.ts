import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'aivoov',
  name: 'AiVOOV',
  description:
    'Generate spoken audio with AI voices, discover voices by language, and transcribe audio into downloadable transcripts and subtitles.',
  metadata: {},
  config,
  auth
});
