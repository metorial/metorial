import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'textrazor',
  name: 'Text Razor',
  description:
    'Natural Language Processing API for extracting entities, topics, categories, relations, and linguistic structures from text.',
  metadata: {},
  config,
  auth
});
