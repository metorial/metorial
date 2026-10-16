import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'elevenreader',
  name: 'ElevenLabs Audio',
  description:
    'Generate and download ElevenLabs speech and sound effects, transcribe audio, design and manage voices, isolate vocals, and manage automatic dubbing. This connection uses the ElevenLabs API; it does not access the ElevenReader library.',
  metadata: {},
  config,
  auth
});
