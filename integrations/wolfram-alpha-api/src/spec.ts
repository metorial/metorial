import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'wolfram-alpha-api',
  name: 'Wolfram Alpha API',
  description:
    'Computational knowledge engine that answers factual queries across mathematics, science, geography, finance, linguistics, and more. Provides structured results, short answers, spoken results, images, and LLM-optimized output.',
  metadata: {},
  config,
  auth
});
