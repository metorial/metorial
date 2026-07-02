import { SlateSpecification } from 'slates';
import { auth } from './auth';
import { config } from './config';

export let spec = SlateSpecification.create({
  key: 'typless',
  name: 'Typless',
  description:
    'AI-powered intelligent document processing platform that automates data extraction from documents using OCR and machine learning.',
  metadata: {},
  config,
  auth
});
