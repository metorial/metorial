import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'winston-ai',
  name: 'Winston AI',
  description:
    'Content integrity platform that detects AI-generated text and images, checks for plagiarism, verifies factual claims, and compares texts for similarity.',
  metadata: {},
  config,
  auth
});
