import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'groqcloud',
  name: 'Groq Cloud',
  description:
    'AI inference platform powered by Groq LPUs, providing OpenAI-compatible API endpoints for running open-source language models with ultra-low latency.',
  metadata: {},
  config,
  auth
});
