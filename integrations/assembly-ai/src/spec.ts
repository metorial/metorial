import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'assemblyai',
  name: 'AssemblyAI',
  description:
    'Speech AI platform providing APIs for speech-to-text transcription, audio intelligence models, and an LLM gateway for applying large language models to transcribed speech data.',
  metadata: {},
  config,
  auth
});
