import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'dart',
  name: 'Dart',
  description:
    'AI-native project management platform for managing tasks, documents, and dartboards with AI-powered automation.',
  metadata: {},
  config,
  auth
});
