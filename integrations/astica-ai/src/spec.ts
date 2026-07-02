import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'astica-ai',
  name: 'Astica AI',
  description:
    'Cognitive intelligence platform providing AI APIs for computer vision, text-to-speech, speech-to-text, natural language processing, and AI image generation.',
  metadata: {},
  config,
  auth
});
