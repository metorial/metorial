import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'flowiseai',
  name: 'Flowise',
  description:
    'Open-source generative AI platform for building AI agents and LLM workflows visually.',
  metadata: {},
  config,
  auth
});
