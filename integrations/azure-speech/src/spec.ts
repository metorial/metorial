import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'azure-speech',
  name: 'Azure Speech',
  description:
    'Cloud-based speech processing service providing speech-to-text, text-to-speech, speaker recognition, and pronunciation assessment capabilities.',
  metadata: {},
  config,
  auth
});
