import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'parsera',
  name: 'Parsera',
  description:
    'AI-powered web scraping service that extracts structured data from web pages using natural-language descriptions.',
  metadata: {},
  config,
  auth
});
