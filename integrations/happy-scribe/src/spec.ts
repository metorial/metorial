import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'happy-scribe',
  name: 'Happy Scribe',
  description:
    'Cloud-based transcription and subtitling platform that converts audio and video files into text using AI-powered automatic transcription or human professional transcription services.',
  metadata: {},
  config,
  auth
});
