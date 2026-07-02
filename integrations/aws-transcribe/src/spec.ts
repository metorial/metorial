import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'aws-transcribe',
  name: 'AWS Transcribe',
  description:
    'Amazon Transcribe automatic speech recognition (ASR) service for converting speech to text via batch and streaming transcription.',
  metadata: {},
  config,
  auth
});
