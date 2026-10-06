import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'studio-by-ai21-labs',
  name: 'AI21 Studio',
  description:
    'Use Jamba chat, Maestro runs, and the document library with an AI21 Studio API key.',
  metadata: {},
  config,
  auth
});
