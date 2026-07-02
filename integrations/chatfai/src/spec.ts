import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'chatfai',
  name: 'ChatFAI',
  description:
    'AI-powered platform for having conversations with AI-generated characters inspired by movies, TV shows, books, history, and other media.',
  metadata: {},
  config,
  auth
});
